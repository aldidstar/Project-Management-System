CREATE TABLE bread(
    id INTEGER primary key AUTOINCREMENT,
    nama varChar(50) NOT NULL,
    berat number NOT NULL,
    tinggi number NOT NULL,
    tanggal date,
    hubungan boolean NOT NULL

);
insert into bread(nama, berat, tinggi, tanggal, hubungan)
VALUES('Messi', 63, 163, '2021-06-06','true');

