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

    // Detail bidang tanah yang tercatat pada sertifikat
    struct CertificateDetails {
        address petugasPenerbit; // wallet address petugas BPN yang menerbitkan sertifikat
        address petugasLoket;    // wallet address petugas loket yang menerima/mendaftarkan berkas
        string nib;              // Nomor Induk Bidang
        uint256 luasTanah;        // luas tanah dalam meter persegi (m2)
        string tipeSertifikat;    // contoh: "SHM", "SHGB", "SHGU", "SHP"
    }

    mapping(uint256 => string) public _certificateCID;
    mapping(uint256 => bool) public revoked;
    mapping(uint256 => OwnershipRecord[]) private _ownershipHistory;
    mapping(uint256 => CertificateDetails) private _certificateDetails;

    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        address indexed executedBy
    );

    event CertificateDetailsSet(
        uint256 indexed tokenId,
        address indexed petugasPenerbit,
        address indexed petugasLoket,
        string nib,
        uint256 luasTanah,
        string tipeSertifikat
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
        require(officerAddress != address(0), "Invalid officer address");
        require(!hasRole(BPN_ROLE, officerAddress), "Officer already has BPN_ROLE");

        grantRole(BPN_ROLE, officerAddress);
    }

    function removeOfficer(address officerAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(BPN_ROLE, officerAddress);
    }

    function mintCertificate(
        address recipient,
        address petugasLoket,
        string memory nib,
        uint256 luasTanah,
        string memory tipeSertifikat
    )
        external
        onlyRole(BPN_ROLE)
        returns (uint256)
    {
        require(bytes(nib).length > 0, "NIB required");
        require(luasTanah > 0, "Luas tanah must be > 0");
        require(bytes(tipeSertifikat).length > 0, "Tipe sertifikat required");
        require(petugasLoket != address(0), "Invalid petugas loket");

        uint256 tokenId = _tokenIdCounter++;

        _safeMint(recipient, tokenId);

        // Gunakan _msgSender() untuk mencatat petugas BPN (penerbit) yang menjalankan transaksi ini
        address petugasPenerbit = _msgSender();

        _certificateDetails[tokenId] = CertificateDetails({
            petugasPenerbit: petugasPenerbit,
            petugasLoket: petugasLoket,
            nib: nib,
            luasTanah: luasTanah,
            tipeSertifikat: tipeSertifikat
        });

        _ownershipHistory[tokenId].push(
            OwnershipRecord(recipient, block.timestamp, petugasPenerbit)
        );

        emit CertificateMinted(tokenId, recipient, petugasPenerbit);
        emit CertificateDetailsSet(tokenId, petugasPenerbit, petugasLoket, nib, luasTanah, tipeSertifikat);

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

    function getCertificateDetails(uint256 tokenId)
        external
        view
        returns (CertificateDetails memory)
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return _certificateDetails[tokenId];
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
