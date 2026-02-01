// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateNFT is ERC721, Ownable {
    uint256 private _tokenIdCounter = 1; // mulai dari 1

    // Simpan CID IPFS per token
    mapping(uint256 => string) private _certificateCID;

    // Event ketika NFT sertifikat berhasil di-mint
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string cid
    );

    constructor() ERC721("PolyLand NFT", "PLYNFT") Ownable(msg.sender) {}


    /// @notice Mint sertifikat NFT
    function mintCertificate(address recipient, string memory cid)
        public
        onlyOwner
        returns (uint256)
    {
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(recipient, newTokenId);
        _certificateCID[newTokenId] = cid;

        emit CertificateMinted(newTokenId, recipient, cid);

        _tokenIdCounter++;

        return newTokenId;
    }

    /// @notice Ambil CID IPFS dari token
    function getCID(uint256 tokenId) public view returns (string memory) {
        address owner;
        try this.ownerOf(tokenId) returns (address tokenOwner) {
            owner = tokenOwner; // token ada
        } catch {
            revert("Token does not exist"); // token tidak ada
        }

        return _certificateCID[tokenId];
    }

    /// @notice Verifikasi sertifikat
    function verifyCertificate(uint256 tokenId)
        public
        view
        returns (
            bool valid,
            address owner,
            string memory cid
        )
    {
        try this.ownerOf(tokenId) returns (address tokenOwner) {
            owner = tokenOwner;
            return (true, owner, _certificateCID[tokenId]);
        } catch {
            return (false, address(0), "");
        }
    }
}
