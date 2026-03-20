// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IPayment {
    function isPaid(string memory applicationId)
        external
        view
        returns (bool);

    function getPaymentInfo(string memory applicationId)
        external
        view
        returns (
            address payer,
            uint256 area,
            uint256 amount,
            uint256 timestamp
        );
}

contract CertificateNFT is ERC721, AccessControl {

    uint256 private _tokenIdCounter = 1;

    bytes32 public constant BPN_ROLE = keccak256("BPN_ROLE");

    IPayment public paymentContract;

    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
    }

    mapping(uint256 => string) private _certificateCID;
    mapping(uint256 => bool) public revoked;
    mapping(uint256 => OwnershipRecord[]) private _ownershipHistory;

    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string cid
    );

    event OwnershipTransferredByBPN(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    event CertificateRevoked(uint256 indexed tokenId);

    constructor(address admin, address paymentAddress)
        ERC721("PolyLand NFT", "PLYNFT")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BPN_ROLE, admin);

        paymentContract = IPayment(paymentAddress);
    }

    /*//////////////////////////////////////////////////////////////
                        MINT (SETELAH BAYAR)
    //////////////////////////////////////////////////////////////*/

    function mintCertificate(
        string memory applicationId,
        address recipient,
        string memory cid
    )
        external
        onlyRole(BPN_ROLE)
        returns (uint256)
    {
        require(
            paymentContract.isPaid(applicationId),
            "Application not paid"
        );

        uint256 tokenId = _tokenIdCounter++;

        _safeMint(recipient, tokenId);
        _certificateCID[tokenId] = cid;

        _ownershipHistory[tokenId].push(
            OwnershipRecord(recipient, block.timestamp)
        );

        emit CertificateMinted(tokenId, recipient, cid);

        return tokenId;
    }

    /*//////////////////////////////////////////////////////////////
                        PERALIHAN HAK RESMI
    //////////////////////////////////////////////////////////////*/

    function transferOwnershipByBPN(
        uint256 tokenId,
        address newOwner
    )
        external
        onlyRole(BPN_ROLE)
    {
        require(!revoked[tokenId], "Certificate revoked");

        address currentOwner = ownerOf(tokenId);

        _transfer(currentOwner, newOwner, tokenId);

        _ownershipHistory[tokenId].push(
            OwnershipRecord(newOwner, block.timestamp)
        );

        emit OwnershipTransferredByBPN(
            tokenId,
            currentOwner,
            newOwner
        );
    }

    /*//////////////////////////////////////////////////////////////
                        REVOKE
    //////////////////////////////////////////////////////////////*/

    function revoke(uint256 tokenId)
        external
        onlyRole(BPN_ROLE)
    {
        revoked[tokenId] = true;
        emit CertificateRevoked(tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                        DISABLE TRANSFER BEBAS
    //////////////////////////////////////////////////////////////*/

    function _update(
        address to,
        uint256 tokenId,
        address auth
    )
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Kalau bukan mint (from == 0) dan bukan burn (to == 0)
        if (from != address(0) && to != address(0)) {
            revert("Direct transfer not allowed");
        }

        return super._update(to, tokenId, auth);
    }

    /*//////////////////////////////////////////////////////////////
                        HISTORY VIEW
    //////////////////////////////////////////////////////////////*/

    function getOwnershipHistory(uint256 tokenId)
        external
        view
        returns (OwnershipRecord[] memory)
    {
        return _ownershipHistory[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}