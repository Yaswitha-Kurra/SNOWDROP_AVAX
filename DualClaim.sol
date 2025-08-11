// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DualClaim is Ownable {
  struct Drop {
    address creator;
    string token;
    uint256 amount;
    uint256 usdcAmount; // for dual
    uint256 numRecipients;
    uint256 claimed;
  }

  mapping(bytes32 => Drop) public drops;
  mapping(bytes32 => mapping(address => bool)) public claimed;

  address public immutable usdc;

  constructor(address _usdc) Ownable(msg.sender) {
  usdc = _usdc;
}


  event DropCreated(
    bytes32 indexed dropId,
    address indexed creator,
    string token,
    uint256 totalAmount,
    uint256 numRecipients
  );

  event Claimed(
    bytes32 indexed dropId,
    address indexed user,
    string token,
    uint256 amount
  );

  function createDrop(
    string memory token,
    uint256 totalAmount,
    uint256 numRecipients
  ) external payable returns (bytes32 dropId) {
    require(numRecipients > 0, "Need at least 1 recipient");

    if (keccak256(abi.encodePacked(token)) == keccak256("AVAX")) {
      require(msg.value == totalAmount, "Incorrect AVAX");
    } else if (keccak256(abi.encodePacked(token)) == keccak256("USDC")) {
      require(
        IERC20(usdc).transferFrom(msg.sender, address(this), totalAmount),
        "USDC transfer failed"
      );
    } else {
      revert("Invalid token");
    }

    dropId = keccak256(abi.encodePacked(msg.sender, block.timestamp, token, totalAmount, numRecipients));

    drops[dropId] = Drop({
      creator: msg.sender,
      token: token,
      amount: totalAmount,
      usdcAmount: 0,
      numRecipients: numRecipients,
      claimed: 0
    });

    emit DropCreated(dropId, msg.sender, token, totalAmount, numRecipients);
  }

  function createDualDrop(
    uint256 avaxAmount,
    uint256 usdcAmount,
    uint256 numRecipients
  ) external payable returns (bytes32 dropId) {
    require(msg.value == avaxAmount, "Incorrect AVAX sent");
    require(numRecipients > 0, "Need recipients");

    // ✅ Pull USDC into the contract
    require(
      IERC20(usdc).transferFrom(msg.sender, address(this), usdcAmount),
      "USDC transfer failed"
    );

    dropId = keccak256(abi.encodePacked(msg.sender, block.timestamp, avaxAmount, usdcAmount, numRecipients));

    drops[dropId] = Drop({
      creator: msg.sender,
      token: "DUAL",
      amount: avaxAmount,
      usdcAmount: usdcAmount,
      numRecipients: numRecipients,
      claimed: 0
    });

    emit DropCreated(dropId, msg.sender, "DUAL", avaxAmount + usdcAmount, numRecipients);
  }

  function claim(bytes32 dropId) external {
    Drop storage d = drops[dropId];
    require(d.numRecipients > 0, "Drop not found");
    require(!claimed[dropId][msg.sender], "Already claimed");
    require(d.claimed < d.numRecipients, "All claimed");

    claimed[dropId][msg.sender] = true;
    d.claimed++;

    uint256 share = d.amount / d.numRecipients;
    uint256 usdcShare = d.usdcAmount / d.numRecipients;

    if (keccak256(abi.encodePacked(d.token)) == keccak256("AVAX")) {
      payable(msg.sender).transfer(share);
      emit Claimed(dropId, msg.sender, "AVAX", share);
    } else if (keccak256(abi.encodePacked(d.token)) == keccak256("USDC")) {
      require(IERC20(usdc).transfer(msg.sender, share), "USDC transfer failed");
      emit Claimed(dropId, msg.sender, "USDC", share);
    } else if (keccak256(abi.encodePacked(d.token)) == keccak256("DUAL")) {
      if (share > 0) {
        payable(msg.sender).transfer(share);
      }
      if (usdcShare > 0) {
        require(IERC20(usdc).transfer(msg.sender, usdcShare), "USDC failed");
      }
      emit Claimed(dropId, msg.sender, "DUAL", share + usdcShare);
    } else {
      revert("Invalid token");
    }
  }

  // Optional admin withdraw
  function withdraw() external onlyOwner {
    payable(owner()).transfer(address(this).balance);
    IERC20(usdc).transfer(owner(), IERC20(usdc).balanceOf(address(this)));
  }
}
