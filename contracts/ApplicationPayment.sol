// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// OpenZeppelin
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IERC20Extended {
    function decimals() external view returns (uint8);
}

contract ApplicationPayment is ReentrancyGuard {

    using SafeERC20 for IERC20;

    address public owner;
    IERC20 public token;
    uint8 public tokenDecimals;

    constructor(address _token) {
        owner = msg.sender;
        token = IERC20(_token);
        tokenDecimals = IERC20Extended(_token).decimals();
    }

    struct PaymentInfo {
        address payer;
        bytes32 kantahCode;
        uint256 area;
        uint256 amount;
        uint256 timestamp;
        bool refunded;
    }

    struct KantahFee {
        uint256 landPricePerM2;
        uint256 registrationFee;
        bool exists;
    }

    mapping(bytes32 => PaymentInfo) public payments;
    mapping(bytes32 => KantahFee) public kantahFees;

    event KantahFeeUpdated(bytes32 kantahCode, uint256 landPricePerM2, uint256 registrationFee);
    event PaymentReceived(bytes32 indexed applicationId, bytes32 kantahCode, address indexed payer, uint256 amount);
    event Refunded(bytes32 indexed applicationId, address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function setKantahFee(
        bytes32 kantahCode,
        uint256 landPricePerM2,
        uint256 registrationFee
    ) external onlyOwner {
        require(landPricePerM2 > 0, "Invalid price");

        kantahFees[kantahCode] = KantahFee({
            landPricePerM2: landPricePerM2,
            registrationFee: registrationFee,
            exists: true
        });

        emit KantahFeeUpdated(kantahCode, landPricePerM2, registrationFee);
    }

    function calculateCost(bytes32 kantahCode, uint256 area)
        public
        view
        returns (uint256)
    {
        KantahFee memory fee = kantahFees[kantahCode];
        require(fee.exists, "Kantah not set");

        uint256 landCost = (fee.landPricePerM2 * area) / 1000;
        return landCost + fee.registrationFee;
    }
    
    function pay(
        bytes32 applicationId,
        bytes32 kantahCode,
        uint256 area
    ) external nonReentrant {
        require(payments[applicationId].payer == address(0), "Already paid");

        uint256 amount = calculateCost(kantahCode, area);

        require(
            token.allowance(msg.sender, address(this)) >= amount,
            "Insufficient allowance"
        );

        token.safeTransferFrom(msg.sender, address(this), amount);

        payments[applicationId] = PaymentInfo({
            payer: msg.sender,
            kantahCode: kantahCode,
            area: area,
            amount: amount,
            timestamp: block.timestamp,
            refunded: false
        });

        emit PaymentReceived(applicationId, kantahCode, msg.sender, amount);
    }

    function refund(bytes32 applicationId) external onlyOwner nonReentrant {
        PaymentInfo storage p = payments[applicationId];

        require(p.payer != address(0), "Not found");
        require(!p.refunded, "Already refunded");

        p.refunded = true;

        token.safeTransfer(p.payer, p.amount);

        emit Refunded(applicationId, p.payer, p.amount);
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        token.safeTransfer(owner, amount);
    }

    function isPaid(bytes32 applicationId) external view returns (bool) {
        return payments[applicationId].payer != address(0);
    }

    function getPaymentInfo(bytes32 applicationId)
        external
        view
        returns (PaymentInfo memory)
    {
        return payments[applicationId];
    }
}