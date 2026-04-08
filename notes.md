<!-- V1 -->
first deployment address : 0xE097202b948E26eCb26DdAAC1cB1C21A588aE0aF
second deployment address with RABC : 0x223F85e402137A9c92c56Afef3BF63335be7922f


<!-- V2 -->
PolyLandModule#ApplicationPayment - 0xFFe2AFc616738fa9879567687a1F220013d6D75B
PolyLandModule#CertificateNFT - 0x3DaBCab8495385cfcF2169F5Bf167a19Da177405

<!-- V3 -->
PolyLandModule#ApplicationPayment - 0xb5013Adaac0BdB93F65aF8c099e7F38941368684
PolyLandModule#CertificateNFT - 0xf4859763888B90c6fd0e09dC4B462cA52b451bCB

<!-- Alur penerbitan sertifikat -->

1. user mengajukan permohonan peralihan hak jual beli dengan jenis SHM,SHGB, SHGBU
2. admin verifikasi berkas dan dokumen, jika iya akan lanjut ke proses pembayaran, jika tidak akan kembali ke tahap pertama
3. tahap pembayaran dengan menggunakan USDC. user harus topup USDC dengan jumlah pembayaran yang telah ditentukan
4. jika berhasil maka backend akan menangkap event paymentRecived, dimana nantinya akan mengupdate status permohonan, dan mencetak sertifikat dan upload ke ipfs.
5. user akan mendapatkan notifikasi apabila proses ke 4 sudah selesai, dan dapat dilihat di menu sertifikatku

<!-- Struktur NIB pada sertifikat tanah -->

NIB terdiri dari 14 digit, yang terdiri dari :
1. 2 Digit  : Kode Provinsi. (source : https://github.com/gilang-as/indonesian-region-code#)
2. 2 Digit  : Kode Kabupaten atau Kota. (source : https://github.com/gilang-as/indonesian-region-code#)
3. 9 Digit  : Nomor urut bidang tanah yang unik di wilayah tersebut. (Harus berupa angka (0-9).)
4. 1 Digit  : Kode Indeks Letak Bidang Tanah

Makna kode indeks letak bidang tanah :
0: Terletak di permukaan tanah.
1: Ruang atas tanah.
2: Ruang bawah tanah.
3: Satuan rumah susun (Sarusun).
4: Bidang di atas bidang permukaan tanah.
5: Ruang pada ruang atas tanah.
6: Ruang pada ruang bawah tanah.


  const nib = await generateNIB(application?.land?.province_code, application?.land?.regency_code, 1);

  const nibFormated = 


3535090900000011

agar menjadi 35.09.000000001.1