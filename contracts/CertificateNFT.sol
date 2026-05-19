// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CertificateNFT is ERC721, AccessControl {

    uint256 private _tokenIdCounter = 1;

    bytes32 public constant BPN_ROLE = keccak256("BPN_ROLE");

    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
    }

    mapping(uint256 => string) public _certificateCID;
    mapping(uint256 => bool) public revoked;
    mapping(uint256 => OwnershipRecord[]) private _ownershipHistory;

    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient
    );

    event CertificateCIDSet(
        uint256 indexed tokenId,
        string cid
    );

    event OwnershipTransferredByBPN(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );

    event CertificateRevoked(uint256 indexed tokenId);

    constructor(address admin)
        ERC721("PolyLand NFT", "PLYNFT")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BPN_ROLE, admin);
    }

    function mintCertificate(
        address recipient
    )
        external
        onlyRole(BPN_ROLE)
        returns (uint256)
    {
        uint256 tokenId = _tokenIdCounter++;

        _safeMint(recipient, tokenId);

        _ownershipHistory[tokenId].push(
            OwnershipRecord(recipient, block.timestamp)
        );

        emit CertificateMinted(tokenId, recipient);

        return tokenId;
    }

    function setCertificateCID(
        uint256 tokenId,
        string memory cid
    )
        external
        onlyRole(BPN_ROLE)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(bytes(_certificateCID[tokenId]).length == 0, "CID already set");
        require(!revoked[tokenId], "Certificate revoked");

        _certificateCID[tokenId] = cid;

        emit CertificateCIDSet(tokenId, cid);
    }

    function transferOwnershipByBPN(
        uint256 tokenId,
        address newOwner,
        string memory newCid
    )
        external
        onlyRole(BPN_ROLE)
    {
        require(!revoked[tokenId], "Certificate revoked");

        address currentOwner = ownerOf(tokenId);

        _transfer(currentOwner, newOwner, tokenId);

        _certificateCID[tokenId] = newCid;

        _ownershipHistory[tokenId].push(
            OwnershipRecord(newOwner, block.timestamp)
        );

        emit OwnershipTransferredByBPN(
            tokenId,
            currentOwner,
            newOwner
        );
    }

    function revoke(uint256 tokenId)
        external
        onlyRole(BPN_ROLE)
    {
        revoked[tokenId] = true;
        emit CertificateRevoked(tokenId);
    }

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

        if (from != address(0) && to != address(0)) {
            revert("Direct transfer not allowed");
        }

        return super._update(to, tokenId, auth);
    }

    function getOwnershipHistory(uint256 tokenId)
        external
        view
        returns (OwnershipRecord[] memory)
    {
        return _ownershipHistory[tokenId];
    }

    function isVerified(uint256 tokenId)
        public
        view
        returns (bool)
    {
        return
            _ownerOf(tokenId) != address(0) &&
            !revoked[tokenId];
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