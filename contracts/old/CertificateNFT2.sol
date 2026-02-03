// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 CertificateNFT.sol

 - ERC721 NFT untuk Sertifikat Tanah
 - AccessControl untuk memisahkan admin/minter
 - Menyimpan hanya pointer (CID) ke IPFS (metadata & PDF)
 - Emit event saat mint & revoke
 - TokenURI mengembalikan "ipfs://<cid>"
 - Revocation flag (tidak membakar token supaya audit trail tetap ada)

 Note:
 - Backend (server) memegang private key yang memiliki MINTER_ROLE, sehingga user
   tidak perlu sign transaksi untuk mendapatkan NFT (backend yang mengirim tx).
 - Untuk privacy/gas: simpan hanya CID on-chain. Semua detail lengkap di IPFS JSON.
*/

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CertificateNFT is ERC721, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    Counters.Counter private _tokenIdCounter;

    // tokenId => ipfs cid (without ipfs:// prefix)
    mapping(uint256 => string) private _cid;

    // tokenId => certificate number (e.g., "12345/HM/2025") — optional but handy
    mapping(uint256 => string) private _certificateNumber;

    // tokenId => revoked flag
    mapping(uint256 => bool) private _revoked;

    // Events
    event CertificateMinted(uint256 indexed tokenId, address indexed recipient, string cid, string certificateNumber);
    event CertificateRevoked(uint256 indexed tokenId, address indexed revokedBy, string reason);

    constructor(string memory name_, string memory symbol_, address admin) ERC721(name_, symbol_) {
        // Setup roles
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);

        // start token IDs at 1 (optional). If want start at 0, remove increment here.
        _tokenIdCounter.increment();
    }

    /**
     * @notice Mint a new certificate NFT.
     * @dev Only accounts with MINTER_ROLE can call. Uses _safeMint to ensure recipient can accept NFTs.
     * @param recipient Address that will own the NFT.
     * @param cid IPFS CID (just the hash part, without "ipfs://").
     * @param certificateNumber Human-readable certificate identifier (optional; can be empty).
     * @return tokenId minted token id.
     */
    function mintCertificate(address recipient, string calldata cid, string calldata certificateNumber)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256)
    {
        require(recipient != address(0), "recipient zero");
        require(bytes(cid).length > 0, "cid empty");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(recipient, tokenId);

        _cid[tokenId] = cid;
        _certificateNumber[tokenId] = certificateNumber;
        _revoked[tokenId] = false;

        emit CertificateMinted(tokenId, recipient, cid, certificateNumber);
        return tokenId;
    }

    /**
     * @notice Mark certificate as revoked (for example: invalidated by authority).
     * @dev Does not burn token, only marks revoked. Only admin (DEFAULT_ADMIN_ROLE) can revoke.
     * @param tokenId the token to revoke.
     * @param reason short reason text (optional).
     */
    function revokeCertificate(uint256 tokenId, string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_exists(tokenId), "token not exists");
        require(!_revoked[tokenId], "already revoked");
        _revoked[tokenId] = true;
        emit CertificateRevoked(tokenId, msg.sender, reason);
    }

    /**
     * @notice Check if a certificate was revoked.
     */
    function isRevoked(uint256 tokenId) external view returns (bool) {
        require(_exists(tokenId), "token not exists");
        return _revoked[tokenId];
    }

    /**
     * @notice Get the stored IPFS CID (without ipfs:// prefix).
     */
    function getCID(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "token not exists");
        return _cid[tokenId];
    }

    /**
     * @notice Get certificate basic data: owner, cid, certificateNumber, revoked
     */
    function getCertificate(uint256 tokenId)
        external
        view
        returns (
            address owner,
            string memory cid,
            string memory certificateNumber,
            bool revoked
        )
    {
        require(_exists(tokenId), "token not exists");
        owner = ownerOf(tokenId);
        cid = _cid[tokenId];
        certificateNumber = _certificateNumber[tokenId];
        revoked = _revoked[tokenId];
    }

    /**
     * @notice tokenURI returns ipfs://<cid>
     * If no CID stored, returns empty string.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "token not exists");
        string memory cid = _cid[tokenId];
        if (bytes(cid).length == 0) {
            return "";
        }
        return string(abi.encodePacked("ipfs://", cid));
    }

    // OPTIONAL: Admin may want to update CID in case metadata moved (not recommended).
    // Use with extreme caution — better keep immutable. Only DEFAULT_ADMIN_ROLE can call.
    function updateCID(uint256 tokenId, string calldata newCid) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_exists(tokenId), "token not exists");
        require(bytes(newCid).length > 0, "cid empty");
        _cid[tokenId] = newCid;
    }

    // The contract uses standard ERC721 transfer behavior. If you want to disallow transfers
    // (or require admin approval for transfer), override _beforeTokenTransfer and add checks.
    //
    // Example (commented) to disallow transfers except mint/burn:
    //
    // function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
    //     super._beforeTokenTransfer(from, to, tokenId);
    //     // from == address(0) => minting; to == address(0) => burning
    //     if (from != address(0) && to != address(0)) {
    //         revert("transfers disabled; use admin process");
    //     }
    // }

}
