// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";

/**
 * @title PolyLandForwarder
 * @dev Contract ini bertindak sebagai Trusted Forwarder untuk eksekusi Gasless Transaction.
 * Menggunakan standar ERC2771Forwarder resmi dari OpenZeppelin v5.0+.
 * 
 * Fitur bawaan:
 * 1. Verifikasi EIP-712 Typed Data Signature milik Petugas BPN.
 * 2. Proteksi Replay Attack menggunakan internal Nonce tracking per account.
 * 3. Eksekusi transaksi dengan biaya gas dibayar oleh Relayer BPN.
 */
contract JejakTanahkuForwarder is ERC2771Forwarder {
    
    /**
     * @dev Constructor menerima parameter `name` untuk EIP-712 Domain Separator.
     * Nama ini ("PolyLandForwarder") harus sama persis dengan yang dikirim dari Frontend Vue 3 / Viem saat mensign data.
     */
    constructor() ERC2771Forwarder("JejakTanahkuForwarder") {}

}