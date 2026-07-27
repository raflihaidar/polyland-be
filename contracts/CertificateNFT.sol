// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract CertificateNFT is ERC721, AccessControl, ERC2771Context {

    uint256 private _tokenIdCounter = 1;

    bytes32 public constant BPN_ROLE = keccak256("BPN_ROLE");

    bool private _bpnTransferInProgress;

    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
        address executedBy;
    }

    mapping(uint256 => string) public _certificateCID;
    mapping(uint256 => bool) public revoked;
    mapping(uint256 => OwnershipRecord[]) private _ownershipHistory;

    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        address indexed executedBy
    );

    event CertificateCIDSet(
        uint256 indexed tokenId,
        string cid,
        address indexed executedBy
    );

    event OwnershipTransferredByBPN(
        uint256 indexed tokenId,
        address indexed to,
        address indexed executedBy
    );

    event CertificateRevoked(uint256 indexed tokenId, address indexed executedBy);

    // Constructor menerima address Trusted Forwarder (Trusted Relayer / Paymaster)
    constructor(address admin, address trustedForwarder)
        ERC721("JejakTanah NFT", "JTNFT")
        ERC2771Context(trustedForwarder) // Registrasi trusted forwarder
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BPN_ROLE, admin);
    }

    function addOfficer(address officerAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Validasi 1: Pastikan address bukan address nol / kosong
        require(officerAddress != address(0), "Invalid officer address");

        // Validasi 2: Pastikan petugas belum memiliki BPN_ROLE agar tidak boros gas fee
        require(!hasRole(BPN_ROLE, officerAddress), "Officer already has BPN_ROLE");

        grantRole(BPN_ROLE, officerAddress);
    }

    function removeOfficer(address officerAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(BPN_ROLE, officerAddress);
    }

    function mintCertificate(address recipient)
        external
        onlyRole(BPN_ROLE)
        returns (uint256)
    {
        uint256 tokenId = _tokenIdCounter++;

        _safeMint(recipient, tokenId);

        // Gunakan _msgSender() untuk mencatat petugas asli
        _ownershipHistory[tokenId].push(
            OwnershipRecord(recipient, block.timestamp, _msgSender())
        );

        emit CertificateMinted(tokenId, recipient, _msgSender());

        return tokenId;
    }

    function setCertificateCID(uint256 tokenId, string memory cid)
        external
        onlyRole(BPN_ROLE)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(bytes(_certificateCID[tokenId]).length == 0, "CID already set");
        require(!revoked[tokenId], "Certificate revoked");

        _certificateCID[tokenId] = cid;

        emit CertificateCIDSet(tokenId, cid, _msgSender());
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

        _bpnTransferInProgress = true;
        _transfer(currentOwner, newOwner, tokenId);
        _bpnTransferInProgress = false;

        _certificateCID[tokenId] = newCid;

        _ownershipHistory[tokenId].push(
            OwnershipRecord(newOwner, block.timestamp, _msgSender())
        );

        emit OwnershipTransferredByBPN(
            tokenId,
            newOwner,
            _msgSender()
        );
    }

    function revoke(uint256 tokenId) external onlyRole(BPN_ROLE) {
        require(!revoked[tokenId], "Already revoked");
        revoked[tokenId] = true;
        emit CertificateRevoked(tokenId, _msgSender());
    }

    // Standard ERC-721 Metadata Resolver
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return string(abi.encodePacked("ipfs://", _certificateCID[tokenId]));
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

        if (revoked[tokenId]) {
            revert("Cannot transfer revoked certificate");
        }

        if (
            from != address(0) &&
            to != address(0) &&
            !_bpnTransferInProgress
        ) {
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

    function isVerified(uint256 tokenId) public view returns (bool) {
        return _ownerOf(tokenId) != address(0) && !revoked[tokenId];
    }

    // --- OVERRIDE WAJIB UNTUK ERC2771Context & AccessControl ---
    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address)
    {
        return ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    function _contextSuffixLength()
        internal
        view
        override(Context, ERC2771Context)
        returns (uint256)
    {
        return ERC2771Context._contextSuffixLength();
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