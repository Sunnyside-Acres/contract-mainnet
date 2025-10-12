// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title IERC20
 * @notice Standard ERC20 token interface
 */
interface IERC20 {
    /**
     * @notice Returns the total token supply
     * @return uint256 Total supply of tokens
     */
    function totalSupply() external view returns (uint256);

    /**
     * @notice Returns the token balance of an account
     * @param account Address to query balance
     * @return uint256 Token balance
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @notice Transfers tokens to a recipient
     * @param to Recipient address
     * @param amount Amount of tokens to transfer
     * @return bool True if transfer was successful
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @notice Returns the remaining number of tokens that spender can spend
     * @param owner Address of the token owner
     * @param spender Address of the spender
     * @return uint256 Remaining allowance
     */
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /**
     * @notice Approves spender to spend tokens on behalf of caller
     * @param spender Address to approve
     * @param amount Amount of tokens to approve
     * @return bool True if approval was successful
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @notice Transfers tokens from one address to another using allowance
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param amount Amount of tokens to transfer
     * @return bool True if transfer was successful
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    /**
     * @notice Emitted when tokens are transferred
     * @param from Address tokens are transferred from
     * @param to Address tokens are transferred to
     * @param value Amount of tokens transferred
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @notice Emitted when allowance is set
     * @param owner Address of the token owner
     * @param spender Address of the spender
     * @param value Amount of tokens approved
     */
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}
