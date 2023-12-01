const express = require('express');
const app = express();
const { Client } = require('pg');
const cors = require('cors');
const bp = require('body-parser');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
const fs = require('fs');


const corsOptions = {
  origin: 'http://localhost:3300', // Sesuaikan dengan origin yang sesuai
  credentials: true,
  optionsSuccessStatus: 200
};

const db = new Client({
    user: 'mohammadvarrel23',
    host: 'ep-polished-water-013849.ap-southeast-1.aws.neon.tech',
    database: 'ApplyJob',
    password: 'n2GKNID3iWsS',
    port: 5432,
    sslmode: 'require',
    ssl: true
});


db.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('Connected to the database Project');
    }
});

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
  }));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors(corsOptions));
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

function ensureAdmin(req, res, next) {
  if (req.session.userRole === 'Admin') {
      next(); // If the user is an admin, proceed to the next middleware function or route handler
  } else {
      res.status(403).send('Forbidden'); // If the user is not an admin, send a 403 Forbidden response
  }
}

function ensureAuthenticated(req, res, next) {
  if (req.session.userRole) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
}

app.get('/page.html', ensureAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'page.html'));
});

app.get('/page2.html', ensureAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'page2.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'login.html'));
});

app.post('/login', async (req, res) => {
  const { nama, password } = req.body;

  if (!nama || !password) {
      return res.status(400).send('Invalid request');
  }

  try {
      const query = 'SELECT id, nama, role, password FROM account WHERE nama = $1;';
      const { rows: results } = await db.query(query, [nama]);

      if (results.length < 1) {
          return res.status(401).send('Nama salah');
      }

      const storedPassword = results[0].password;
      const userRole = results[0].role;

      if (password === storedPassword) {
        if (userRole === 'Admin' || userRole === 'User') {
            req.session.userRole = userRole; // Store user role in session
            return res.status(200).json({
                message: `Login successful (${userRole})`,
                user_id: results[0].id,
                user_role: userRole,
            });
        } else {
            return res.status(401).send('Hanya user dan admin yang dapat login');
        }
    }
      return res.status(401).send('Password salah');
  } catch (error) {
      console.error(error);
      return res.status(500).send('Internal Server Error');
  }
});

app.post('/apply_job', upload.single('file_upload'), async (req, res) => {
  try {
    const { nama, tanggal_lahir } = req.body;
    const fileUpload = req.file ? req.file : null;

    if (!nama || !tanggal_lahir) {
      return res.status(400).json({ error: 'Nama and tanggal_lahir must be provided' });
    }

    let fileData = null;

    if (fileUpload) {
      // Read the file content as a byte array
      fileData = fileUpload.buffer;
    }

    const query = 'UPDATE account SET tanggal_lahir = $1, file_upload = $2 WHERE nama = $3 RETURNING *';
    const values = [tanggal_lahir, fileData, nama];

    const result = await db.query(query, values);

    if (result.rows.length > 0) {
      const updatedData = result.rows[0];
      return res.status(200).json({ message: 'Update account successful', data: updatedData });
    } else {
      return res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error(error);

    if (error.code === '23505') {
      return res.status(400).json({ error: 'Nama sudah digunakan, pilih nama yang lain' });
    } else {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});

// app.post('/apply_job', upload.single('file_upload'), async (req, res) => {
//   try {
//     const { nama, tanggal_lahir } = req.body;
//     const fileUpload = req.file ? req.file.buffer : null;

//     if (!nama || !tanggal_lahir || !fileUpload) {
//       return res.status(400).json({ error: 'Nama, tanggal_lahir, dan file_upload harus diisi' });
//     }

//     // Simpan data ke database
//     const query = 'INSERT INTO account (nama, role, password, tanggal_lahir, file_upload) VALUES ($1, $2, $3, $4, $5) RETURNING *';
//     const values = [nama, 'User', 'random_password', tanggal_lahir, fileUpload];

//     const result = await db.query(query, values);
//     const insertedData = result.rows[0];

//     res.status(201).json({ message: 'Apply job successful', data: insertedData });
//   } catch (error) {
//     console.error(error);

//     // Tambahkan penanganan kesalahan yang lebih spesifik
//     if (error.code === '23505') {
//       return res.status(400).json({ error: 'Nama sudah digunakan, pilih nama yang lain' });
//     } else {
//       return res.status(500).json({ error: 'Internal Server Error' });
//     }
//   }
// });

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, '../Frontend', 'login.html'));
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if(err) {
      return console.log(err);
    }
    res.redirect('/login.html');
  });
});

app.listen(3300,()=>{
  console.log('Server berjalan pada port 3300')
})


//http://localhost:3300/login.html


