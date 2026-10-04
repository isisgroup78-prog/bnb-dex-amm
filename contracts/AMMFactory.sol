// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import './AMMPair.sol';

contract AMMFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 indexed pairIndex);

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'IDENTICAL_ADDRESSES');
        require(tokenA != address(0) && tokenB != address(0), 'ZERO_ADDRESS');
        require(tokenA.code.length > 0 && tokenB.code.length > 0, 'NOT_CONTRACT');

        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(getPair[token0][token1] == address(0), 'PAIR_EXISTS');

        pair = address(new AMMPair());
        AMMPair(pair).initialize(token0, token1);

        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length - 1);
    }
}
