// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.28;

// import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
// import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

// contract CertificateNFT is ERC721, AccessControl, ERC2771Context {

//     uint256 private _tokenIdCounter = 1;

//     bytes32 public constant BPN_ROLE = keccak256("BPN_ROLE");

//     bool private _bpnTransferInProgress;

//     struct OwnershipRecord {
//         address owner;
//         uint256 timestamp;
//         address executedBy;
//     }

//     struct WorkflowParticipants {
//         address pemohon;             
//         address loket;                
//         address seksiPeralihanHak;    
//     }

//     struct CertificateMetadata {
//         string nib;             
//         uint256 luasTanah;       
//         string jenisHak;         
//     }

//     mapping(uint256 => string) public _certificateCID;
//     mapping(uint256 => bool) public revoked;
//     mapping(uint256 => OwnershipRecord[]) private _ownershipHistory;
//     mapping(uint256 => WorkflowParticipants) private _workflowParticipants;
//     mapping(uint256 => CertificateMetadata) private _certificateMetadata;

//     mapping(bytes32 => uint256) private _activeNibToTokenId;

//     event CertificateMinted(
//         uint256 indexed tokenId,
//         address indexed recipient,
//         address indexed executedBy
//     );

//     event CertificateCIDSet(
//         uint256 indexed tokenId,
//         string cid,
//         address indexed executedBy
//     );

//     event OwnershipTransferredByBPN(
//         uint256 indexed tokenId,
//         address indexed to,
//         address indexed executedBy
//     );

//     event CertificateRevoked(uint256 indexed tokenId, address indexed executedBy);

//     event WorkflowParticipantsSet(
//         uint256 indexed tokenId,
//         address pemohon,
//         address loket,
//         address seksiPeralihanHak,
//         address indexed executedBy
//     );

//     event CertificateMetadataSet(
//         uint256 indexed tokenId,
//         string nib,
//         uint256 luasTanah,
//         string jenisHak,
//         address indexed executedBy
//     );

//     event NibReleased(uint256 indexed tokenId, string nib, address indexed executedBy);

//     constructor(address admin, address trustedForwarder)
//         ERC721("JejakTanah NFT", "JTNFT")
//         ERC2771Context(trustedForwarder) // Registrasi trusted forwarder
//     {
//         _grantRole(DEFAULT_ADMIN_ROLE, admin);
//         _grantRole(BPN_ROLE, admin);
//     }

//     function addOfficer(address officerAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         require(officerAddress != address(0), "Invalid officer address");

//         require(!hasRole(BPN_ROLE, officerAddress), "Officer already has BPN_ROLE");

//         grantRole(BPN_ROLE, officerAddress);
//     }

//     function removeOfficer(address officerAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
//         require(hasRole(BPN_ROLE, officerAddress), "Officer does not have BPN_ROLE");
//         revokeRole(BPN_ROLE, officerAddress);
//     }

//     /// @param recipient wallet pemohon/penerima NFT
//     /// @param loket wallet petugas loket
//     /// @param seksiPeralihanHak wallet petugas seksi peralihan hak
//     /// @param nib Nomor Identifikasi Bidang tanah
//     /// @param luasTanah luas tanah dalam m2
//     /// @param jenisHak jenis hak atas tanah
//     function mintCertificate(
//         address recipient,
//         address loket,
//         address seksiPeralihanHak,
//         string memory nib,
//         uint256 luasTanah,
//         string memory jenisHak
//     )
//         external
//         onlyRole(BPN_ROLE)
//         returns (uint256)
//     {
//         require(recipient != address(0), "Invalid recipient address");
//         require(loket != address(0), "Invalid loket address");
//         require(seksiPeralihanHak != address(0), "Invalid seksi peralihan hak address");
//         require(bytes(nib).length > 0, "NIB required");
//         require(luasTanah > 0, "Luas tanah must be > 0");
//         require(bytes(jenisHak).length > 0, "Jenis hak required");

//         bytes32 nibHash = keccak256(bytes(nib));
//         uint256 existingTokenId = _activeNibToTokenId[nibHash];

//         if (existingTokenId != 0) {
//             return _reassignExistingCertificate(
//                 existingTokenId,
//                 recipient,
//                 loket,
//                 seksiPeralihanHak,
//                 luasTanah,
//                 jenisHak
//             );
//         }

//         uint256 tokenId = _tokenIdCounter++;

//         _ownershipHistory[tokenId].push(
//             OwnershipRecord(recipient, block.timestamp, _msgSender())
//         );

//         _workflowParticipants[tokenId] = WorkflowParticipants({
//             pemohon: recipient,
//             loket: loket,
//             seksiPeralihanHak: seksiPeralihanHak
//         });

//         _certificateMetadata[tokenId] = CertificateMetadata({
//             nib: nib,
//             luasTanah: luasTanah,
//             jenisHak: jenisHak
//         });

//         _activeNibToTokenId[nibHash] = tokenId;

//         emit WorkflowParticipantsSet(
//             tokenId,
//             recipient,
//             loket,
//             seksiPeralihanHak,
//             _msgSender()
//         );

//         emit CertificateMetadataSet(
//             tokenId,
//             nib,
//             luasTanah,
//             jenisHak,
//             _msgSender()
//         );

//         _safeMint(recipient, tokenId);

//         emit CertificateMinted(tokenId, recipient, _msgSender());

//         return tokenId;
//     }

//     function _reassignExistingCertificate(
//         uint256 tokenId,
//         address newOwner,
//         address loket,
//         address seksiPeralihanHak,
//         uint256 luasTanah,
//         string memory jenisHak
//     ) private returns (uint256) {
//         require(!revoked[tokenId], "Certificate revoked");

//         address currentOwner = ownerOf(tokenId);

//         if (currentOwner != newOwner) {
//             _bpnTransferInProgress = true;
//             _transfer(currentOwner, newOwner, tokenId);
//             _bpnTransferInProgress = false;

//             _ownershipHistory[tokenId].push(
//                 OwnershipRecord(newOwner, block.timestamp, _msgSender())
//             );

//             emit OwnershipTransferredByBPN(tokenId, newOwner, _msgSender());
//         }

//         delete _certificateCID[tokenId];

//         _workflowParticipants[tokenId] = WorkflowParticipants({
//             pemohon: newOwner,
//             loket: loket,
//             seksiPeralihanHak: seksiPeralihanHak
//         });

//         string memory nib = _certificateMetadata[tokenId].nib;

//         _certificateMetadata[tokenId] = CertificateMetadata({
//             nib: nib,
//             luasTanah: luasTanah,
//             jenisHak: jenisHak
//         });

//         emit WorkflowParticipantsSet(
//             tokenId,
//             newOwner,
//             loket,
//             seksiPeralihanHak,
//             _msgSender()
//         );

//         emit CertificateMetadataSet(
//             tokenId,
//             nib,
//             luasTanah,
//             jenisHak,
//             _msgSender()
//         );

//         return tokenId;
//     }

//     function updateCertificateMetadata(
//         uint256 tokenId,
//         string memory nib,
//         uint256 luasTanah,
//         string memory jenisHak
//     )
//         external
//         onlyRole(BPN_ROLE)
//     {
//         require(_ownerOf(tokenId) != address(0), "Token does not exist");
//         require(!revoked[tokenId], "Certificate revoked");
//         require(bytes(nib).length > 0, "NIB required");
//         require(luasTanah > 0, "Luas tanah must be > 0");
//         require(bytes(jenisHak).length > 0, "Jenis hak required");

//         string memory oldNib = _certificateMetadata[tokenId].nib;
//         bytes32 oldNibHash = keccak256(bytes(oldNib));
//         bytes32 newNibHash = keccak256(bytes(nib));

//         if (oldNibHash != newNibHash) {
//             require(_activeNibToTokenId[newNibHash] == 0, "NIB already has an active certificate");
//             if (_activeNibToTokenId[oldNibHash] == tokenId) {
//                 delete _activeNibToTokenId[oldNibHash];
//             }
//             _activeNibToTokenId[newNibHash] = tokenId;
//         }

//         _certificateMetadata[tokenId] = CertificateMetadata({
//             nib: nib,
//             luasTanah: luasTanah,
//             jenisHak: jenisHak
//         });

//         emit CertificateMetadataSet(
//             tokenId,
//             nib,
//             luasTanah,
//             jenisHak,
//             _msgSender()
//         );
//     }

//     function setCertificateCID(uint256 tokenId, string memory cid)
//         external
//         onlyRole(BPN_ROLE)
//     {
//         require(_ownerOf(tokenId) != address(0), "Token does not exist");
//         require(bytes(cid).length > 0, "CID required");
//         require(bytes(_certificateCID[tokenId]).length == 0, "CID already set");
//         require(!revoked[tokenId], "Certificate revoked");

//         _certificateCID[tokenId] = cid;

//         emit CertificateCIDSet(tokenId, cid, _msgSender());
//     }

//     function transferOwnershipByBPN(
//         uint256 tokenId,
//         address newOwner,
//         string memory newCid
//     )
//         external
//         onlyRole(BPN_ROLE)
//     {
//         require(!revoked[tokenId], "Certificate revoked");
//         require(newOwner != address(0), "Invalid new owner address");
//         require(bytes(newCid).length > 0, "CID required");

//         address currentOwner = ownerOf(tokenId);

//         _bpnTransferInProgress = true;
//         _transfer(currentOwner, newOwner, tokenId);
//         _bpnTransferInProgress = false;

//         _certificateCID[tokenId] = newCid;

//         _ownershipHistory[tokenId].push(
//             OwnershipRecord(newOwner, block.timestamp, _msgSender())
//         );

//         _workflowParticipants[tokenId].pemohon = newOwner;

//         emit OwnershipTransferredByBPN(
//             tokenId,
//             newOwner,
//             _msgSender()
//         );

//         emit CertificateCIDSet(tokenId, newCid, _msgSender());
//     }

//     function revoke(uint256 tokenId) external onlyRole(BPN_ROLE) {
//         require(!revoked[tokenId], "Already revoked");
//         revoked[tokenId] = true;

//         string memory nib = _certificateMetadata[tokenId].nib;
//         bytes32 nibHash = keccak256(bytes(nib));
//         if (_activeNibToTokenId[nibHash] == tokenId) {
//             delete _activeNibToTokenId[nibHash];
//             emit NibReleased(tokenId, nib, _msgSender());
//         }

//         emit CertificateRevoked(tokenId, _msgSender());
//     }

//     function tokenURI(uint256 tokenId)
//         public
//         view
//         override
//         returns (string memory)
//     {
//         require(_ownerOf(tokenId) != address(0), "Token does not exist");
//         return string(abi.encodePacked("ipfs://", _certificateCID[tokenId]));
//     }

//     function _update(
//         address to,
//         uint256 tokenId,
//         address auth
//     )
//         internal
//         override
//         returns (address)
//     {
//         address from = _ownerOf(tokenId);

//         if (revoked[tokenId]) {
//             revert("Cannot transfer revoked certificate");
//         }

//         if (
//             from != address(0) &&
//             to != address(0) &&
//             !_bpnTransferInProgress
//         ) {
//             revert("Direct transfer not allowed");
//         }

//         return super._update(to, tokenId, auth);
//     }

//     function getOwnershipHistory(uint256 tokenId)
//         external
//         view
//         returns (OwnershipRecord[] memory)
//     {
//         return _ownershipHistory[tokenId];
//     }

//     function getWorkflowParticipants(uint256 tokenId)
//         external
//         view
//         returns (WorkflowParticipants memory)
//     {
//         require(_ownerOf(tokenId) != address(0), "Token does not exist");
//         return _workflowParticipants[tokenId];
//     }

//     function getCertificateMetadata(uint256 tokenId)
//         external
//         view
//         returns (CertificateMetadata memory)
//     {
//         require(_ownerOf(tokenId) != address(0), "Token does not exist");
//         return _certificateMetadata[tokenId];
//     }

//     function isNibActive(string memory nib) external view returns (bool) {
//         return _activeNibToTokenId[keccak256(bytes(nib))] != 0;
//     }

//     /// @notice Mengembalikan tokenId aktif untuk sebuah NIB, 0 kalau NIB belum/tidak terpakai.
//     function getActiveTokenIdByNib(string memory nib) external view returns (uint256) {
//         return _activeNibToTokenId[keccak256(bytes(nib))];
//     }

//     function isVerified(uint256 tokenId) public view returns (bool) {
//         return _ownerOf(tokenId) != address(0) && !revoked[tokenId];
//     }

//     // --- OVERRIDE WAJIB UNTUK ERC2771Context & AccessControl ---
//     function _msgSender()
//         internal
//         view
//         override(Context, ERC2771Context)
//         returns (address)
//     {
//         return ERC2771Context._msgSender();
//     }

//     function _msgData()
//         internal
//         view
//         override(Context, ERC2771Context)
//         returns (bytes calldata)
//     {
//         return ERC2771Context._msgData();
//     }

//     function _contextSuffixLength()
//         internal
//         view
//         override(Context, ERC2771Context)
//         returns (uint256)
//     {
//         return ERC2771Context._contextSuffixLength();
//     }

//     function supportsInterface(bytes4 interfaceId)
//         public
//         view
//         override(ERC721, AccessControl)
//         returns (bool)
//     {
//         return super.supportsInterface(interfaceId);
//     }
// }
