const express = require('express');
const multer = require('multer');
const cors = require('cors');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const https = require('https');

const app = express();
const port = 443;

//Параметры фото
const width = 500;
const height = 500;
const format = 'webp';

app.use(express.json());
app.use(cors());
app.use(express.static('uploads'));

// Конфигурация multer для временного хранения файлов в памяти
const storage = multer.memoryStorage();

const upload = multer({ storage: storage }).single('photo');

// Роут для загрузки файла
app.post('/upload', (req, res) => {
	upload(req, res, async err => {
		if (err) {
			console.error(err);
			return res.status(500).json({ message: 'Ошибка загрузки файла' });
		}

		// Проверяем, был ли файл загружен
		if (!req.file) {
			return res.status(400).json({ message: 'Файл не был загружен' });
		}

		try {
			// Изменяем формат и разрешение изображения
			const processedImageBuffer = await sharp(req.file.buffer)
				.resize({ width: width, height: height }) // Устанавливаем размеры изображения
				.toFormat(format) // Устанавливаем формат
				.toBuffer(); // Получаем буфер измененного изображения

			// Формируем имя файла с уникальным суффиксом
			const uniqueSuffix =
				Date.now() + '-' + Math.round(Math.random() * 1e9);
			const filename = uniqueSuffix + '.' + format;

			// Сохраняем измененное изображение
			fs.writeFile(
				path.join(__dirname, 'uploads', filename),
				processedImageBuffer,
				err => {
					if (err) {
						console.error(err);
						return res
							.status(500)
							.json({ message: 'Ошибка сохранения файла' });
					}

					// Формируем ссылку на загруженный файл
					const fileUrl = `/${filename}`;
					res.json({ url: fileUrl });
				}
			);
		} catch (error) {
			console.error(error);
			res.status(500).json({ message: 'Ошибка сохранения изображения!' });
		}
	});
});

// Роут для удаления одного файла
app.delete('/delete/:filename', (req, res) => {
	try {
		const { filename } = req.params;
		const filePath = path.join(__dirname, 'uploads', filename);

		fs.unlink(filePath, err => {
			if (err) {
				console.error(err);
				return res.status(500).json({ message: 'error' });
			}

			res.json({ message: 'ok' });
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Ошибка удаления изображения!' });
	}
});

//Роут для удаления массива файлов
app.post('/delete-multiple', (req, res) => {
	try {
		const filenames = req.body.filenames;

		filenames.forEach(filename => {
			if (filename !== 'product-not-found.webp') {
				const filePath = path.join(__dirname, 'uploads', filename);
				fs.unlink(filePath, err => {
					if (err) {
						console.log(`Ошибка удаления файла: ${filename}`);
					}
				});
			}
		});

		res.json({ message: 'ok' });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: 'Ошибка удаления изображений!' });
	}
});

const server = https.createServer(
	{
		key: fs.readFileSync('path/to/private/key.pem'), // Путь к закрытому ключу
		cert: fs.readFileSync('path/to/certificate.pem') // Путь к сертификату
	},
	app
);

server.listen(port, () => {
	console.log(`Image server listening on port ${port}`);
});
