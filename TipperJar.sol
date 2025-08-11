// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TipperJar {
  address public owner;
  address public escrow;

  mapping(address => uint256) public jarBalances;

  event Deposited(address indexed user, uint256 amount);
  event Withdrawn(address indexed user, uint256 amount);
  event TipSentViaJar(address indexed from, string twitterHandle, uint256 amount);
  event EmergencyWithdrawn(address indexed admin, uint256 amount);

  constructor(address _escrow) {
    owner = msg.sender;
    escrow = _escrow;
  }

  modifier onlyOwner() {
    require(msg.sender == owner, "Not authorized");
    _;
  }

  function deposit() external payable {
    require(msg.value > 0, "Deposit must be > 0");
    jarBalances[msg.sender] += msg.value;
    emit Deposited(msg.sender, msg.value);
  }

  function tipFromJarFor(address from, string calldata twitterHandle, uint256 amount) external {
    require(amount > 0, "Tip must be > 0");
    require(jarBalances[from] >= amount, "Insufficient jar balance");

    jarBalances[from] -= amount;

    (bool sent, ) = escrow.call{ value: amount }(
      abi.encodeWithSignature("recordJarTip(string)", twitterHandle)
    );
    require(sent, "AVAX forward to Escrow failed");

    emit TipSentViaJar(from, twitterHandle, amount);
  }

  function withdraw(uint256 amount) external {
    require(amount > 0, "Withdraw must be > 0");
    require(jarBalances[msg.sender] >= amount, "Insufficient jar balance");

    jarBalances[msg.sender] -= amount;
    (bool sent, ) = payable(msg.sender).call{value: amount}("");
    require(sent, "Withdraw failed");

    emit Withdrawn(msg.sender, amount);
  }

  function emergencyWithdraw() external onlyOwner {
    uint256 bal = address(this).balance;
    require(bal > 0, "Nothing to withdraw");

    (bool sent, ) = payable(owner).call{value: bal}("");
    require(sent, "Emergency withdraw failed");

    emit EmergencyWithdrawn(owner, bal);
  }

  receive() external payable {
    jarBalances[msg.sender] += msg.value;
    emit Deposited(msg.sender, msg.value);
  }
}
