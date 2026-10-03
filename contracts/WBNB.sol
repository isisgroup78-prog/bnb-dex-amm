pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract WBNB is ERC20 {
    event Deposit(address indexed src, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    constructor() ERC20('Wrapped BNB', 'WBNB') {}

    receive() external payable {
        deposit();
    }

    fallback() external payable {
        deposit();
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, 'INSUFFICIENT_BALANCE');
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }
}
