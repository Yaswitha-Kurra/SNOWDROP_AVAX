// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function allowance(address owner, address spender) external view returns (uint256);
}

contract TweetEscrow {
  address public owner;
  address public usdcToken;

  struct Tip {
    address from;
    uint256 amount;
  }

  mapping(bytes32 => Tip[]) public avaxTips;
  mapping(bytes32 => Tip[]) public usdcTips;

  constructor(address _usdcToken) {
    owner = msg.sender;
    usdcToken = _usdcToken;
  }

  function tipWithAVAX(string calldata twitterHandle) external payable {
    require(msg.value > 0, "No AVAX sent");
    bytes32 handleHash = keccak256(abi.encodePacked(twitterHandle));
    avaxTips[handleHash].push(Tip(msg.sender, msg.value));
  }

  function tipWithUSDC(string calldata twitterHandle, uint256 amount) external {
    require(amount > 0, "Invalid amount");
    require(IERC20(usdcToken).allowance(msg.sender, address(this)) >= amount, "Not approved");

    IERC20(usdcToken).transferFrom(msg.sender, address(this), amount);
    bytes32 handleHash = keccak256(abi.encodePacked(twitterHandle));
    usdcTips[handleHash].push(Tip(msg.sender, amount));
  }

  function claimAVAX(string calldata twitterHandle, address payable receiver) external {
    bytes32 handleHash = keccak256(abi.encodePacked(twitterHandle));
    Tip[] storage tipsArray = avaxTips[handleHash];

    uint256 total = 0;
    for (uint256 i = 0; i < tipsArray.length; i++) {
      total += tipsArray[i].amount;
    }

    require(total > 0, "No AVAX tips to claim");
    delete avaxTips[handleHash];

    (bool success, ) = receiver.call{value: total}("");
    require(success, "AVAX transfer failed");
  }

  function claimUSDC(string calldata twitterHandle, address receiver) external {
    bytes32 handleHash = keccak256(abi.encodePacked(twitterHandle));
    Tip[] storage tipsArray = usdcTips[handleHash];

    uint256 total = 0;
    for (uint256 i = 0; i < tipsArray.length; i++) {
      total += tipsArray[i].amount;
    }

    require(total > 0, "No USDC tips to claim");
    delete usdcTips[handleHash];

    IERC20(usdcToken).transfer(receiver, total);
  }

  function hasAVAXTips(string calldata twitterHandle) external view returns (bool) {
    return avaxTips[keccak256(abi.encodePacked(twitterHandle))].length > 0;
  }

  function hasUSDCTips(string calldata twitterHandle) external view returns (bool) {
    return usdcTips[keccak256(abi.encodePacked(twitterHandle))].length > 0;
  }

  function setUSDC(address newToken) external {
    require(msg.sender == owner, "Not authorized");
    usdcToken = newToken;
  }

  function getAVAXTips(string calldata twitterHandle) external view returns (Tip[] memory) {
    return avaxTips[keccak256(abi.encodePacked(twitterHandle))];
  }

  function getUSDCTips(string calldata twitterHandle) external view returns (Tip[] memory) {
    return usdcTips[keccak256(abi.encodePacked(twitterHandle))];
  }

  // ✅ Required for TipperJar → Escrow
  function recordJarTip(string calldata twitterHandle) external payable {
    require(msg.value > 0, "No AVAX sent");

    bytes32 handleHash = keccak256(abi.encodePacked(twitterHandle));
    avaxTips[handleHash].push(Tip(msg.sender, msg.value));
  }

  receive() external payable {}
}
