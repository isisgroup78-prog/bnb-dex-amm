// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './AMMFactory.sol';
import './AMMPair.sol';
import './WBNB.sol';

contract AMMRouter {
    address public immutable factory;
    address public immutable WBNB_TOKEN;

    constructor(address _factory, address _wbnb) {
        require(_factory != address(0) && _wbnb != address(0), 'INVALID_ADDRESS');
        factory = _factory;
        WBNB_TOKEN = _wbnb;
    }

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, 'EXPIRED');
        _;
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(amountA > 0, 'INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'INSUFFICIENT_LIQUIDITY');
        amountB = (amountA * reserveB) / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        require(amountIn > 0, 'INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'INSUFFICIENT_LIQUIDITY');
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transfer.selector, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FAILED');
    }

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FROM_FAILED');
    }

    function _safeTransferETH(address to, uint256 amount) internal {
        (bool success,) = payable(to).call{value: amount}('');
        require(success, 'ETH_TRANSFER_FAILED');
    }

    function _getPair(address tokenA, address tokenB) internal view returns (address pair) {
        pair = AMMFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), 'PAIR_NOT_FOUND');
    }

    function _getOrderedReserves(address pair, address tokenA, address tokenB)
        internal
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        require(tokenA != tokenB, 'IDENTICAL_TOKENS');
        address token0 = AMMPair(pair).token0();
        address token1 = AMMPair(pair).token1();
        require(
            (tokenA == token0 && tokenB == token1) || (tokenA == token1 && tokenB == token0),
            'INVALID_TOKENS'
        );
        (uint256 reserve0, uint256 reserve1,) = AMMPair(pair).getReserves();
        if (tokenA == token0) return (reserve0, reserve1);
        return (reserve1, reserve0);
    }

    function _validatePath(address[] calldata path) internal pure {
        require(path.length >= 2, 'INVALID_PATH');
        for (uint256 i = 0; i < path.length; i++) {
            require(path[i] != address(0), 'ZERO_ADDRESS');
            if (i > 0) require(path[i] != path[i - 1], 'IDENTICAL_TOKENS');
        }
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        public
        view
        returns (uint256[] memory amounts)
    {
        _validatePath(path);
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i = 0; i < path.length - 1; i++) {
            address pair = _getPair(path[i], path[i + 1]);
            (uint256 reserveIn, uint256 reserveOut) = _getOrderedReserves(pair, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    function _swap(uint256[] memory amounts, address[] calldata path, address finalTo) internal {
        for (uint256 i = 0; i < path.length - 1; i++) {
            address input = path[i];
            address output = path[i + 1];
            address pair = AMMFactory(factory).getPair(input, output);
            require(pair != address(0), 'PAIR_NOT_FOUND');

            address token0 = AMMPair(pair).token0();
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) =
                input == token0 ? (uint256(0), amountOut) : (amountOut, uint256(0));

            address to = i < path.length - 2
                ? AMMFactory(factory).getPair(output, path[i + 2])
                : finalTo;
            require(to != address(0), 'INVALID_RECIPIENT');
            AMMPair(pair).swap(amount0Out, amount1Out, to);
        }
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(to != address(0), 'INVALID_TO');
        require(tokenA != tokenB, 'IDENTICAL_TOKENS');

        if (AMMFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            AMMFactory(factory).createPair(tokenA, tokenB);
        }

        address pair = AMMFactory(factory).getPair(tokenA, tokenB);
        (uint256 reserveA, uint256 reserveB) = _getOrderedReserves(pair, tokenA, tokenB);

        if (reserveA == 0 && reserveB == 0) {
            amountA = amountADesired;
            amountB = amountBDesired;
        } else {
            uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = quote(amountBDesired, reserveB, reserveA);
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }

        require(amountA >= amountAMin, 'INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'INSUFFICIENT_B_AMOUNT');

        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = AMMPair(pair).mint(to);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        require(msg.value > 0, 'ZERO_VALUE');
        require(token != address(0) && token != WBNB_TOKEN, 'INVALID_TOKEN');
        if (AMMFactory(factory).getPair(token, WBNB_TOKEN) == address(0)) {
            AMMFactory(factory).createPair(token, WBNB_TOKEN);
        }

        address pair = AMMFactory(factory).getPair(token, WBNB_TOKEN);
        (uint256 reserveToken, uint256 reserveWBNB) = _getOrderedReserves(pair, token, WBNB_TOKEN);

        if (reserveToken == 0 && reserveWBNB == 0) {
            amountToken = amountTokenDesired;
            amountETH = msg.value;
        } else {
            uint256 amountETHOptimal = quote(amountTokenDesired, reserveToken, reserveWBNB);
            if (amountETHOptimal <= msg.value) {
                amountToken = amountTokenDesired;
                amountETH = amountETHOptimal;
            } else {
                uint256 amountTokenOptimal = quote(msg.value, reserveWBNB, reserveToken);
                amountToken = amountTokenOptimal;
                amountETH = msg.value;
            }
        }

        require(amountToken >= amountTokenMin, 'INSUFFICIENT_TOKEN_AMOUNT');
        require(amountETH >= amountETHMin, 'INSUFFICIENT_ETH_AMOUNT');

        _safeTransferFrom(token, msg.sender, pair, amountToken);
        WBNB(WBNB_TOKEN).deposit{value: amountETH}();
        _safeTransfer(WBNB_TOKEN, pair, amountETH);
        liquidity = AMMPair(pair).mint(to);

        if (msg.value > amountETH) _safeTransferETH(msg.sender, msg.value - amountETH);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) public ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        require(to != address(0), 'INVALID_TO');
        address pair = _getPair(tokenA, tokenB);
        _safeTransferFrom(pair, msg.sender, address(this), liquidity);
        (uint256 amount0, uint256 amount1) = AMMPair(pair).burn(to);

        if (tokenA == AMMPair(pair).token0()) {
            amountA = amount0;
            amountB = amount1;
        } else if (tokenA == AMMPair(pair).token1()) {
            amountA = amount1;
            amountB = amount0;
        } else {
            revert('INVALID_TOKENS');
        }

        require(amountA >= amountAMin, 'INSUFFICIENT_A_AMOUNT');
        require(amountB >= amountBMin, 'INSUFFICIENT_B_AMOUNT');
    }

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountToken, uint256 amountETH) {
        require(to != address(0), 'INVALID_TO');
        address pair = _getPair(token, WBNB_TOKEN);
        _safeTransferFrom(pair, msg.sender, address(this), liquidity);
        (uint256 amount0, uint256 amount1) = AMMPair(pair).burn(address(this));

        if (token == AMMPair(pair).token0()) {
            amountToken = amount0;
            amountETH = amount1;
        } else if (token == AMMPair(pair).token1()) {
            amountToken = amount1;
            amountETH = amount0;
        } else {
            revert('INVALID_TOKENS');
        }

        require(amountToken >= amountTokenMin, 'INSUFFICIENT_TOKEN_AMOUNT');
        require(amountETH >= amountETHMin, 'INSUFFICIENT_ETH_AMOUNT');

        _safeTransfer(token, to, amountToken);
        WBNB(WBNB_TOKEN).withdraw(amountETH);
        _safeTransferETH(to, amountETH);
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountOut) {
        require(to != address(0), 'INVALID_TO');
        _validatePath(path);
        uint256[] memory amounts = getAmountsOut(amountIn, path);
        amountOut = amounts[amounts.length - 1];
        require(amountOut >= amountOutMin, 'INSUFFICIENT_OUTPUT_AMOUNT');

        address firstPair = _getPair(path[0], path[1]);
        _safeTransferFrom(path[0], msg.sender, firstPair, amountIn);
        _swap(amounts, path, to);
    }

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256 amountOut) {
        require(to != address(0) && path[0] == WBNB_TOKEN, 'INVALID_PATH');
        require(msg.value > 0, 'ZERO_VALUE');
        uint256[] memory amounts = getAmountsOut(msg.value, path);
        amountOut = amounts[amounts.length - 1];
        require(amountOut >= amountOutMin, 'INSUFFICIENT_OUTPUT_AMOUNT');

        address firstPair = _getPair(path[0], path[1]);
        WBNB(WBNB_TOKEN).deposit{value: msg.value}();
        _safeTransfer(WBNB_TOKEN, firstPair, msg.value);
        _swap(amounts, path, to);
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256 amountOut) {
        require(to != address(0) && path[path.length - 1] == WBNB_TOKEN, 'INVALID_PATH');
        _validatePath(path);
        uint256[] memory amounts = getAmountsOut(amountIn, path);
        amountOut = amounts[amounts.length - 1];
        require(amountOut >= amountOutMin, 'INSUFFICIENT_OUTPUT_AMOUNT');

        address firstPair = _getPair(path[0], path[1]);
        _safeTransferFrom(path[0], msg.sender, firstPair, amountIn);
        _swap(amounts, path, address(this));

        WBNB(WBNB_TOKEN).withdraw(amountOut);
        _safeTransferETH(to, amountOut);
    }

    receive() external payable {
        require(msg.sender == WBNB_TOKEN, 'NOT_WBNB');
    }
}
