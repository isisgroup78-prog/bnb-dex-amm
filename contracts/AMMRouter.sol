pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './AMMFactory.sol';
import './AMMPair.sol';

contract AMMRouter {
    address public immutable factory;

    constructor(address _factory) {
        require(_factory != address(0), 'INVALID_FACTORY');
        factory = _factory;
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

    function _safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FROM_FAILED');
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
        if (tokenA == token0) {
            return (reserve0, reserve1);
        }
        return (reserve1, reserve0);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
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

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        address to
    ) external returns (uint256 amountA, uint256 amountB) {
        require(to != address(0), 'INVALID_TO');
        address pair = AMMFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), 'PAIR_NOT_FOUND');

        _safeTransferFrom(pair, msg.sender, address(this), liquidity);
        (uint256 amount0, uint256 amount1) = AMMPair(pair).burn(to);

        if (tokenA == AMMPair(pair).token0()) {
            amountA = amount0;
            amountB = amount1;
        } else {
            amountA = amount1;
            amountB = amount0;
        }
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address tokenIn,
        address tokenOut,
        address to
    ) external returns (uint256 amountOut) {
        require(to != address(0), 'INVALID_TO');
        require(tokenIn != tokenOut, 'IDENTICAL_TOKENS');

        address pair = AMMFactory(factory).getPair(tokenIn, tokenOut);
        require(pair != address(0), 'PAIR_NOT_FOUND');

        (uint256 reserveIn, uint256 reserveOut) = _getOrderedReserves(pair, tokenIn, tokenOut);
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, 'INSUFFICIENT_OUTPUT_AMOUNT');

        _safeTransferFrom(tokenIn, msg.sender, pair, amountIn);

        address token0 = AMMPair(pair).token0();
        if (tokenIn == token0) {
            AMMPair(pair).swap(0, amountOut, to);
        } else {
            AMMPair(pair).swap(amountOut, 0, to);
        }
    }
}
