// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract CertificateNFT is ERC721, AccessControl {
    uint256 private _tokenIdCounter = 1;

    // Role Definitions
    bytes32 public constant BPN_ROLE = keccak256("BPN_ROLE");
    bytes32 public constant CITIZEN_ROLE = keccak256("CITIZEN_ROLE");

    // CID Storage
    mapping(uint256 => string) private _certificateCID;

    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        string cid
    );

    constructor(address admin) ERC721("PolyLand NFT", "PLYNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BPN_ROLE, admin);
    }

    function mintCertificate(address recipient, string memory cid)
        public
        onlyRole(BPN_ROLE)
        returns (uint256)
    {
        uint256 newTokenId = _tokenIdCounter;

        _safeMint(recipient, newTokenId);
        _certificateCID[newTokenId] = cid;

        emit CertificateMinted(newTokenId, recipient, cid);

        _tokenIdCounter++;
        return newTokenId;
    }

    function getCID(uint256 tokenId) public view returns (string memory) {
        try this.ownerOf(tokenId) returns (address) {
            return _certificateCID[tokenId];
        } catch {
            revert("Token does not exist");
        }
    }

    function verifyCertificate(uint256 tokenId)
        public
        view
        returns (bool valid, address owner, string memory cid)
    {
        try this.ownerOf(tokenId) returns (address tokenOwner) {
            return (true, tokenOwner, _certificateCID[tokenId]);
        } catch {
            return (false, address(0), "");
        }
    }

    function addBPN(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(BPN_ROLE, account);
    }

    function addCitizen(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(CITIZEN_ROLE, account);
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
