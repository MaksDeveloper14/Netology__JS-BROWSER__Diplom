'use strict';


// ~~~~~~~~~~~~~~~~~~~~~~ Основной интерфейс приложения DOM ~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = document.querySelector('.app');
const menu = document.querySelector('.menu');
const currentImage = document.querySelector('.current-image');
const error = document.querySelector('.error');
const imageLoader = document.querySelector('.image-loader');
const commentsForm = document.querySelector('.comments__form');
const menuUrl = document.querySelector('.menu__url');


// ~~~~~~~~~~~~~~~~~~~~~~~  Интерфейс меню DOM ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const menuDrag = document.querySelector('.menu__item.drag');
const menuBurger = document.querySelector('.menu__item.burger');
const menuNew = document.querySelector('.menu__item.new');
const menuComments = document.querySelector('.menu__item.comments');
const menuCommentsTools = document.querySelector('.menu__item.comments-tools');
const menuDraw = document.querySelector('.menu__item.draw');
const menuDrawTools = document.querySelector('.menu__item.draw-tools');
const menuShare = document.querySelector('.menu__item.share');
const menuShareTools = document.querySelector('.menu__item.share-tools');

// прелоадер отправки нового комментария
const commentLoader = `<div class="comment" id="comment-loader">
  <div class="loader">
    <span></span>
    <span></span>
    <span></span>
    <span></span>
    <span></span>
  </div>            
</div>`;


// ~~~~~~~~~~~~~~~~~~~~~~ Данные приложения ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 
 // загруженные картинки на сервер
let uploadedImages_ServerInfo = [];

// Текущая картинка id с сервера
let currentImageId;

// Веб-сокет соединение (по умолчанию undefined, создасться только как приложение перейдет в режим рецензирования)
let connectionWebSocket;

// в каком режиме находится меню
let menuMode;

let appByLink;

// Информация нового комментария
let dataNewComment;

currentImage.src = '';


// ~~~~~~~~~~~~~~~~~~~~~~ Отменяем действия браузера по-умолчанию ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// Отмена переноса картинки (браузерное по-умолчанию)
currentImage.addEventListener('dragstart', function(e) {
	e.preventDefault();
});


// ~~~~~~~~~~~~~~~~~~~~~~ Реализуем динамику меню ~~~~~~~~~~~~~~~~~~~~~~~~~~

// убираем рамку у меню
menu.style.border = 'none';

// функционал перемещения меню
function startMenuTransfer() {
	menuDrag.style.cursor = 'move';
	menuDrag.addEventListener('mousedown', onMouseDownMenuTransfer);
}

function stopMenuTransfer() {
	menuDrag.style.cursor = 'default';
	menuDrag.removeEventListener('mousedown', onMouseDownMenuTransfer);
	menuDrag.removeEventListener('mousemove', moveTo);
	document.removeEventListener('mouseup', onMouseUpMenuTransfer);
	document.removeEventListener('mousemove', moveTo);
}

function onMouseDownMenuTransfer() {
	menuDrag.addEventListener('mousemove', moveTo);
	document.addEventListener('mouseup', onMouseUpMenuTransfer);
	document.addEventListener('mousemove', moveTo);
}

function onMouseUpMenuTransfer() {
	document.removeEventListener('mouseup', onMouseUpMenuTransfer);
	menuDrag.removeEventListener('mousemove', moveTo);
	document.removeEventListener('mousemove', moveTo);
}

function moveTo(event) {
	const menuPosition = {
		x: event.pageX - 20 + 'px',
		y: event.pageY - 25 + 'px'
	}
	localStorage.setItem('menuPosition', JSON.stringify(menuPosition));
	menu.style.left = JSON.parse(localStorage.getItem('menuPosition')).x;
	menu.style.top = JSON.parse(localStorage.getItem('menuPosition')).y;

	// Границы перемещения
	let menuDomRect = menu.getBoundingClientRect();
	menu.style.whiteSpace = 'nowrap';
	if(menuDomRect.left <= 0) {
		menu.style.left = 0 + 'px';
	}
	if(menuDomRect.top <= 0) {
		menu.style.top = 0;
	}
	if(menuDomRect.right >= window.innerWidth) {
		menu.style.left = window.innerWidth - menuDomRect.width + 'px';
	}
	if(menuDomRect.bottom >= window.innerHeight) {
		menu.style.top = window.innerHeight - menuDomRect.height + 'px';
	}
}

// на "загрузить новое" цепляем скрытый input_type_file
function inputFileHidden() {
	// элемент
	const input = document.createElement('input');
	input.setAttribute('type', 'file');
	input.setAttribute('accept', 'image/jpeg, image/png');
	// стили
	input.style.cssText= `
  	position: absolute;
  	display: block;
  	top: 0;
  	left: 0;
  	width: 100%;
  	height: 100%;
  	opacity: 0;
  	cursor: pointer;
  	z-index: 100;
	`;
	// вставка в пункт меню "загрузить новое"
	menuNew.prepend(input);
}

// вешаем обработчик клика на бургер, комментарии, рисовать, поделиться 
menuBurger.addEventListener('click', onClickBurger);
menuComments.addEventListener('click', selected);
menuDraw.addEventListener('click', selected);
menuShare.addEventListener('click', selected);

function onClickBurger(e) {
	e.stopPropagation();
	// интерфейс меню
	menuNew.style.display = 'inline-block';
	menuComments.style.display = 'inline-block';
	menuDraw.style.display = 'inline-block';
	menuShare.style.display = 'inline-block';
	// меняем data-state у комментрирования, рисовать, поделиться в initial
	menuComments.setAttribute('data-state', 'initial');
	menuDraw.setAttribute('data-state', 'initial');
	menuShare.setAttribute('data-state', 'initial');
	// заново вешаем обработчики клика на комментирование, рисовать, поделится
	menuComments.addEventListener('click', selected);
	menuDraw.addEventListener('click', selected);
	menuShare.addEventListener('click', selected);

	// меняем режим меню
	menuMode = 'initial';

	// удаляем рисование
	canvas.removeEventListener('mousedown', startDrawing);
	canvas.style.display = 'none';
}

function selected(e) {
	e.stopPropagation();
	// интерфейс меню
	menuNew.style.display = 'none';
	menuComments.style.display = 'none';
	menuDraw.style.display = 'none';
	menuShare.style.display = 'none';
	// целевой элемент показываем
	e.currentTarget.style.display = 'inline-block';
	// меняем data-state целевого элемента
	e.currentTarget.setAttribute('data-state', 'selected');
	// удаляем обработчики на комментирование, рисовать, поделиться
	menuComments.removeEventListener('click', selected);
	menuDraw.removeEventListener('click', selected);
	menuShare.removeEventListener('click', selected);
	// меняем режим меню
	let active = e.currentTarget.className;
	let activeClassNameSplit = active.split(' ');
	let lastIndex = activeClassNameSplit.length - 1;
	let result = activeClassNameSplit[lastIndex];
	menuMode = result;
	if(menuMode === 'draw') {
		// добавляем рисование
		canvas.style.display = 'block';
		canvas.addEventListener('mousedown', startDrawing);
	}

}

function onClickMenuNew(e) {
	if(app.getAttribute('data-state') === 'review') {
		appPublication();
	}
	// Подписываемся на событие выбора файла 
	const inputFile = document.querySelector('input[type=file]');
	inputFile.addEventListener('change', onFileSelected);
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~  Приложение в режиме публикации ~~~~~~~~~~~~~~~~~~~~~~~~


function appPublication() {
	// ~ Данные приложения ~

	if(app.getAttribute('data-state') === 'review') {
		var str = location.href;
		let res = str.split('?');
		location.href = res[0];
	}

	// location.href = 'file:///C:/Web%20%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B0/%D0%9D%D0%B5%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%8F%20-%D0%92%D0%B5%D0%B1-%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D1%87%D0%B8%D0%BA%20(%D0%BA%D1%83%D1%80%D1%81%D1%8B)/JS%20%D0%B2%20%D0%B1%D1%80%D0%B0%D1%83%D0%B7%D0%B5%D1%80%D0%B5/%D0%94%D0%B8%D0%BF%D0%BB%D0%BE%D0%BC%D0%BD%D0%B0%D1%8F%20%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B0/index.html';

	app.setAttribute('data-state', 'publication');
	menuMode = 'publication';


	// ~ Интрефейс приложения ~

	menuNew.querySelector('input[type=file]').style.display = 'block';

	menu.style.display = 'block';

	// меню позиция
	menu.style.left = '45%';
	menu.style.top = '45%';

	// меню интерфейс
	menuBurger.style.display = 'none';
	menuComments.style.display = 'none';
	menuDraw.style.display = 'none';
	menuShare.style.display = 'none';

	// Отменяем меню перемещение
	stopMenuTransfer();

	// картинка
	currentImage.style.display = 'none';

	// комментарии все удаляем
	const commentsFormAll = document.querySelectorAll('.comments__form');
	for(let commentsForm of commentsFormAll) {
		commentsForm.remove();
	}

	// Удаляем канвас, если есть в приложении
	if(app.querySelector('canvas') !== null) {
		deleteCanvas(canvas);	
	}

	// Закрываем веб-сокет соединение
	if(connectionWebSocket !== undefined) {
		connectionWebSocket.close();
	}
}


// ~~~~~~~~~~~~~~~~~~~~~~~~~~  Приложение в режиме рецензирования ~~~~~~~~~~~~~~~~~~~~~~~~


function appReview() {
	console.log('function appReview');

	// ~ интерфейс приложения ~

	createCanvas();

	// меню позиция
	menu.style.left = '25%';
	menu.style.top = '35%';

	// меню интерфейс
	menuBurger.style.display = 'inline-block';
	menuComments.style.display = 'inline-block';
	menuDraw.style.display = 'inline-block';
	menuShare.style.display = 'inline-block';

	// делаем меню перемещаемым
	startMenuTransfer();

	// скрываем с "загрузить новое" input type file
	menuNew.querySelector('input[type=file]').style.display = 'none';

	// на "загрузить новое" вешаем обработчик клика

	// отменяем рисование
	canvas.removeEventListener('mousedown', startDrawing);

	menuShare.setAttribute('data-state', 'selected');
	menuNew.style.display = 'none';
	menuComments.style.display = 'none';
	menuDraw.style.display = 'none';


	// ~ данные приложения ~
	app.setAttribute('data-state', 'review');
	menuMode = 'share';

	createWebSocket();

}


// ~~~~~~~~~~~~~~~~~~~~~~~~~ Выбор файла пользователем с устройства ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


function initUserSelectFile() {
	inputFile.addEventListener('change', processingSelectedFile);
	inputFile.addEventListener('change', sendFileToServer);
}

function onFileSelected(e) {
	console.log('Файл выбран');
	// отправляем файл на сервер
	let file = e.target.files[0];
	sendFile(file);
}

function processingSelectedFile() {
	console.log('Обработка выбранного файла');
}

function sendFileToServer() {
	console.log('Файл отправлен на сервер');
}


// Выбор файла пользователем с помощью drag drop
function userSelectsFileTransfer() {
	app.addEventListener('drop', function(event) {
		event.preventDefault();
		let userFile = event.dataTransfer.files[0];
		if(userFile.type === 'image/jpeg' || userFile.type === 'image/png') {
			sendFile(userFile);
			error.style.display = 'none';
			menu.style.display = 'none';
			currentImage.setAttribute('src', 'Images-User/' + userFile.name);
			document.querySelector('input[type="file"]').style.display = 'none';
		} else {
			error.textContent = 'Неверный формат файла. Пожалуйста, выберите изображение в формате .jpg или .png.';
			error.style.display = 'block';
			menu.style.display = 'none';
			setTimeout(function() {
				error.style.display = 'none';
				appPublication();
			}, 3000);
		}
	});
	app.addEventListener('dragover', function(event) {
		event.preventDefault();
	});
}






// ~~~~~~~~~~~~~~~~~~~~~~~~~ Взаимодействие с сервером по HTTP и WebSocket ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Отправка файла на сервер
function sendFile(file) {
	const xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://neto-api.herokuapp.com/pic');

	let formData = new FormData();
	formData.append('title', file.name);
	formData.append('image', file);

	xhr.addEventListener('load', () => {
		console.log(`Файл ${file.name} сохранен на сервере.`);
		let response = JSON.parse(xhr.response);
		// сохраняем id текущей картинки с сервера
		currentImageId = response.id;
		menuUrl.value = location.href + '?'+ currentImageId;
		location.href = location.href + '?'+ currentImageId;

		console.log(response);

		// обновляем массив успешно загруженных картинок на сервер на клиентской стороне
		uploadedImages_ServerInfo.push(response);

		// файл отправлен (app)
		imageLoader.style.display = 'none';
		currentImage.setAttribute('src', response.url);
		currentImage.style.display = 'block';
		menu.style.display = 'block';

		appReview();
	});
	
	xhr.send(formData);

	// пока файл не отправился (app)
	imageLoader.style.display = 'block';
	menu.style.display = 'none';
}

// Отправить комментарий к загруженному изображению по id
function sendComment(id, comment) {
	// Пользовательская ошибка
	if(typeof comment !== 'object') {
		throw new Error('comment должен быть типом object');
	}
	let body = 'message=' + comment.message + '&left=' + comment.left + '&top=' + comment.top;
	let xhr = new XMLHttpRequest();
	xhr.open('POST', 'https://neto-api.herokuapp.com/pic/'+id+'/comments');
	xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	xhr.addEventListener('load', () => {
		let response = JSON.parse(xhr.response);
		let comments = response.comments;
		console.log(comments);
		console.log(xhr);
		// удаляем прелоадер отправки комментария
		app.querySelector('#comment-loader').remove();
		dataNewComment = response.comments;
		console.log(dataNewComment);
		// Добавляем комментарий в приложение с сервера
	});
	xhr.send(body);
	// вставляем прелоадер отправки комментария в body комментария
	app.querySelector('.comments__input').insertAdjacentHTML('beforebegin', commentLoader);
}

// Получить отправленную картинку, с сервера по id
function requestImage(id) {
	let xhr = new XMLHttpRequest();
	xhr.open('GET', 'https://neto-api.herokuapp.com/pic/' + id);
	xhr.addEventListener('load', () => {
		currentImage.setAttribute('crossorigin', 'anonymous');
		let response = JSON.parse(xhr.response);
		if(appByLink === true) {
			setImage(response);
			setComments(response);
		}
		console.log(response);
	});
	xhr.send();
}

// Обновление текущей картинки в режиме реального времени
function createWebSocket() {
	connectionWebSocket = new WebSocket('wss://neto-api.herokuapp.com/pic/' + currentImageId);

	connectionWebSocket.onopen = function(e) {
		// alert('WebSocket соединение открыто');
	}

	connectionWebSocket.onmessage = function(e) {
		let response = JSON.parse(e.data);
		console.log(response);
		if(response.event === 'mask') {
			// Обновляем ссылку на изображение (с новыми данными)
			currentImage.src = response.url;
			console.log('Есть');
		}
		if(response.event === 'comment') {
			setComments(response);
		}
	}

	connectionWebSocket.onclose = function(e) {
		// alert('WebSocket соединение закрыто');
	}

}


// ~~~~~~~~~~~~~~~~~~~~~~~~~ РЕЖИМ РИСОВАНИЕ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// Вешаем обработчик клика на всех интерфейсах выбора цвета
let inputColorAll = document.querySelectorAll('.menu__color');
for(let inputColor of inputColorAll) {
	inputColor.addEventListener('click', selectColorHtml);
}

// Обработчик клика выбора цвета
function selectColorHtml(e) {
	e.stopPropagation();
	for(let item of document.querySelectorAll('.menu__color')) {
		item.removeAttribute('checked');
	}
	e.target.setAttribute('checked', 'checked');
	let arrayClassname = e.currentTarget.className.split(' ');
	let lastClassname = arrayClassname[arrayClassname.length - 1];
	// вырезать слово из имени класса с конца установить в качестве значения цвета
	colorValue = color[lastClassname];
	ctx.strokeStyle = colorValue;
	ctx.fillStyle = colorValue;
}

// Для функции рисования
let canvas;
let ctx;

let color = {
	red: '#ea5d56',
	yellow: '#f3d135',
	green: '#6cbe47',
	blue: '#53a7f5',
	purple: '#b36ade'
}

let colorValue = color.green
let isMouseDown = false;
let penThickness = 4;


function createCanvas() {
	let canvasTag = '<canvas></canvas>';
	app.insertAdjacentHTML('afterbegin', canvasTag);
	canvas = document.querySelector('canvas');
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	canvas.style.zIndex = 1;
	canvas.style.position = 'absolute';
	canvas.style.left = 0;
	canvas.style.right = 0;
	canvas.style.top = 0;
	canvas.style.bottom = 0;
	ctx = canvas.getContext("2d");

	// чтобы сохраняя canvas (было изображение и рисунки на нем), бросаем загруженное изображение на canvas, 
	currentImage.addEventListener('load', function(e) {
		currentImage.setAttribute('crossorigin', 'anonymous'); // Устанавливаем атрибут img, чтобы брать картинку с другого источника (с CORS) и без порчи canvas
		let currentImageDomRect = currentImage.getBoundingClientRect();
		ctx.drawImage(currentImage, currentImageDomRect.left, currentImageDomRect.top);
	});

	canvas.addEventListener('mousedown', startDrawing);
	canvas.addEventListener('mouseup', stopDrawing);
	canvas.addEventListener('mouseup', sendBinaryData);
}

function deleteCanvas(canvas) {
	canvas.remove();
}

function startDrawing(e) {
	e.stopPropagation();
	canvas.addEventListener('mousemove', painting);
}

function stopDrawing(e) {
	e.stopPropagation();
	canvas.removeEventListener('mousemove', painting);
	ctx.beginPath();
}

// Отправляем бинарные данные canvas по веб-сокету
function sendBinaryData() {
	if(menuMode === 'draw') {
		canvas.toBlob(function(blob) {
			connectionWebSocket.send(blob);
		});
	}
}

function painting(e) {
	e.stopPropagation();
	e.preventDefault();
	// линия
	ctx.lineWidth = penThickness * 2;
	ctx.lineTo(e.clientX, e.clientY);
	ctx.strokeStyle = colorValue;
	ctx.stroke();

	// круг
	ctx.beginPath();
	ctx.arc(e.clientX, e.clientY, penThickness, 0, Math.PI * 2);
	ctx.fillStyle = colorValue;
	ctx.fill();

	// линия
	ctx.beginPath();
	ctx.moveTo(e.clientX, e.clientY);
}



// ~~~~~~~~~~~~~~~~~~~~~~~~~ РЕЖИМ КОММЕНТИРОВАНИЯ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	// Шаблон нового комментария
	const commentNew = `<form class="comments__form">
      <span class="comments__marker"></span><input type="checkbox" class="comments__marker-checkbox">
      <div class="comments__body" style="display:block; position: relative; z-index:99999999">
        <textarea class="comments__input" type="text" placeholder="Напишите ответ..."></textarea>
        <input class="comments__close" type="button" value="Закрыть">
        <input class="comments__submit" type="submit" value="Отправить">
     	</div>
    </form>`;

	// управление интерфейсом
	let commentsFormCollection = app.querySelectorAll('.comments__form');
	const commentsSpanToggle = document.querySelector('.menu__toggle-bg');
	const commentsLableOff = document.querySelector('.menu__toggle-title_off');
	const commentsLableOn = document.querySelector('.menu__toggle-title_on');
	const commentsInputOff = document.getElementById('comments-off');
	const commentsInputOn = document.getElementById('comments-on');
	const inputMenuToggle = document.querySelector('.menu__toggle');

	menuComments.addEventListener('click', activateModeComment);
	menuBurger.addEventListener('click', stopModeComment);

  const comment = `<div class="comment">
   		<p class="comment__time"></p>
   		<p class="comment__message"></p>
   	</div>`

  // Переключатель комментариев span
  commentsToggle();
	function commentsToggle() {
		commentsSpanToggle.addEventListener('click', function(e) {
			console.log('Клик переключатель комментариев!');
			// отмена всплытия
			e.stopPropagation();
			// комментарии включены
			if(commentsInputOff.hasAttribute('checked')) {
				commentsInputOff.removeAttribute('checked');
				commentsInputOn.setAttribute('checked', 'checked');
				// показать комментарии
				for(let commentsForm of commentsFormCollection) {
					commentsForm.style.display = 'block';
				}
			} // комментарии выключены
			else if(commentsInputOn.hasAttribute('checked')) {
				commentsInputOn.removeAttribute('checked');
				commentsInputOff.setAttribute('checked', 'checked');	
				// скрыть комментарии
				for(let commentsForm of commentsFormCollection) {
					commentsForm.style.display = 'none';
				}
			}
		});

		commentsLableOn.addEventListener('click', function(e) {
			console.log('Клик переключатель комментариев!');
			// отмена всплытия
			e.stopPropagation();
			commentsInputOff.setAttribute('checked', 'checked');	
			commentsInputOn.removeAttribute('checked');
			// показать комментарии
			for(let commentsForm of commentsFormCollection) {
				commentsForm.style.display = 'none';
			}
		});

		commentsLableOff.addEventListener('click', function(e) {
			console.log('Клик переключатель комментариев!');
			// отмена всплытия
			e.stopPropagation();
			// комментарии включены
			commentsInputOn.setAttribute('checked', 'checked');
			commentsInputOff.removeAttribute('checked', 'checked');	
			// скрыть комментарии
			for(let commentsForm of commentsFormCollection) {
				commentsForm.style.display = 'block';
			}	
		});
		// commentsLableOn.addEventListener('click', function(e) {
		// 	console.log('клик on');
		// 	e.stopPropagation();
		// 	if(commentsInputOff.hasAttribute('checked')) {
		// 		commentsInputOff.removeAttribute('checked');
		// 		commentsInputOn.setAttribute('checked', 'checked');
		// 		// показать комментарии
		// 		for(let commentsForm of commentsFormCollection) {
		// 			commentsForm.style.display = 'block';
		// 		}
		// 	}
		// });
		// commentsLableOff.addEventListener('click', function(e) {
		// 	console.log('клик off');
		// 	e.stopPropagation();
		// 	if(commentsInputOn.hasAttribute('checked')) {
		// 		commentsInputOn.removeAttribute('checked');
		// 		// скрыть комментарии
		// 		commentsInputOff.setAttribute('checked', 'checked');
		// 		for(let commentsForm of commentsFormCollection) {
		// 			commentsForm.style.display = 'none';
		// 		}
		// 	}
		// });
	};

	// Создать новый комментарий
	function createNewComment(e) {
		console.log('Создать новый комментарий');

		let commentsForm = document.querySelectorAll('.comments__form');
		if(commentsForm.length >= 1) {
			for(let form of commentsForm) {
				let body = form.querySelector('.comments__body');
				let comment = body.querySelector('.comment');
				if(comment === null) {
					form.remove();
				}
				body.style.display = 'none';	
			}
		}
		// z-index
		for(let formComment of commentsForm) {
			console.log(formComment.style.zIndex);
			formComment.style.zIndex = 9999;
		}

		// вставка нового комментария в html
		app.insertAdjacentHTML('beforeend', commentNew);

		// Интерфейс нового комментария
		let commentForm = app.lastChild;
		let commentMarker = commentForm.querySelector('.comments__marker');
		let commentBody = commentForm.querySelector('.comments__body');
		let commentsInput = commentBody.querySelector('.comments__input');
		let commentsClose = commentBody.querySelector('.comments__close');
		let commentsSubmit = commentBody.querySelector('.comments__submit');
		commentMarker.style.zIndex = 9999999999;

		coordinatesNewComment();
		commentsBodyOutViewport();
		clickMarker();
		clickClose();
		clickSend();

		// Координаты нового комментария
		function coordinatesNewComment() {
			app.lastChild.addEventListener('click', function(e) {
				e.stopPropagation(commentsForm);
			});
			app.lastChild.style.left = e.pageX - 25 + 'px';
			app.lastChild.style.top = e.pageY + 5 +'px';
		}
		// Выход тела формы за переделы окна просмотра браузера
		function commentsBodyOutViewport() {
			let commentsFormAll = app.querySelectorAll('.comments__form');
			let commentFormLast = commentsFormAll[commentsFormAll.length - 1];
			let commentBodyLast = commentFormLast.querySelector('.comments__body');
			let commentFormLastDomRect = commentFormLast.getBoundingClientRect();
			let commentBodyLastDomRect = commentBodyLast.getBoundingClientRect();

			console.log(commentBodyLast);
			console.log(commentBodyLastDomRect);

			// определяем выход за границы окна просмотра браузера
			if(commentFormLastDomRect.right >= window.innerWidth) {
				console.log('Выход за пределы right');	
				document.body.style.overflow = 'scroll';
				window.scrollTo( 1000, 1000 );
			}
			if(commentFormLastDomRect.bottom >= window.innerHeight) {
				console.log('Выход за пределы bottom');
				document.body.style.overflow = 'scroll';
				window.scrollTo( 1000, 1000 );
			}
		}
		// Клик по маркеру
		function clickMarker() {
			commentMarker.addEventListener('click', function(e) {
				let commentsForm = document.querySelectorAll('.comments__form');
				let lastForm = commentsForm[commentsForm.length - 1];
				let body = lastForm.querySelector('.comments__body');
				let comment = body.querySelector('.comment');
				if(comment === null) {
					lastForm.remove();
				}
				if(commentsForm.length >= 1) {
					for(let form of commentsForm) {
						let body = form.querySelector('.comments__body');
						body.style.display = 'none';
					}
				}
				if(commentBody.style.display === 'none') {
					commentBody.style.display = 'block';
				} else if(commentBody.style.display === 'block' && commentBody.querySelectorAll('.comment').length !== 0) {
					commentBody.style.display = 'none';
				}
				// при клике по маркеру изменяем overflow тоже
				let markerBody = e.target.parentNode.querySelector('.comments__body');
				let targetDomRect = markerBody.getBoundingClientRect();
				// определяем выход за границы окна просмотра браузера
				if(targetDomRect.right >= window.innerWidth) {
					console.log('Выход за пределы right');	
					document.body.style.overflow = 'scroll';
					window.scrollTo( 1000, 1000 );
				}
				if(targetDomRect.bottom >= window.innerHeight) {
					console.log('Выход за пределы bottom');
					document.body.style.overflow = 'scroll';
					window.scrollTo( 1000, 1000 );
				}
			});
		}
		// Клик по закрыть комментарии
		function clickClose() {
			commentsClose.addEventListener('click', function(e) {
				commentsInput.value = '';
				e.stopPropagation();
				if(commentBody.querySelectorAll('.comment').length === 0) {
					commentForm.style.display = 'none';
					commentForm.remove();
				} else {
					commentBody.style.display = 'none';
				}
				// Убираем скролл если были
				document.body.style.overflow = 'hidden';
			});
		}
		// Клик по отправить комментарий
		function clickSend(e) {
			commentsSubmit.addEventListener('click', function(e) {
				e.preventDefault();
				e.stopPropagation();
				if(commentsInput.value !== '') {
					// Если первый комментарий
					if(commentBody.querySelectorAll('.comment').length === 0) {
						// Обновляем коллекцию комментариев в интерфейсе
						commentsFormCollection = app.querySelectorAll('.comments__form');
						// Если комментарии отключены, не показываем новый комментарий
						if(commentsInputOff.hasAttribute('checked')) {
							console.log(commentsInputOff.hasAttribute('checked'));
							let currnetForm = commentsFormCollection[commentsFormCollection.length - 1];
							console.log(currnetForm);
							currnetForm.style.display = 'none';
						}
						commentBody.style.display = 'none';
					}
					// Отправляем комментарий на сервер
					let commentSend = {
						message: commentsInput.value,
						left: parseInt(app.lastChild.style.left),	
						top: parseInt(app.lastChild.style.top)
					}

					sendComment(currentImageId, commentSend);

					// Добавляем новый комментарий в приложение
					commentBody.insertAdjacentHTML('afterbegin', comment);
					commentBody.querySelector('.comment').querySelector('.comment__time').textContent = new Date().toLocaleString();
					commentBody.querySelector('.comment').querySelector('.comment__message').textContent = commentsInput.value;

					// Очищаем input text после добавления комментария и отправки на сервер
					commentsInput.value = '';
					hiddenScroll(e);
				}
			});
			function indicatorLoading(e) {
				// добавляем прелоадер
				e.target.parentNode.querySelector('.comments__input').insertAdjacentHTML('beforebegin',commentLoader);
			}
			function hiddenScroll(e) {
				// убираем скроллыесли боди не выходит за пределы viewport
				let markerBody = e.target.parentNode;
				let targetDomRect = markerBody.getBoundingClientRect();
				// определяем выход за границы окна просмотра браузера
				if(targetDomRect.right < window.innerWidth) {
					document.body.style.overflow = 'hidden';
					window.scrollTo(0, 0);
				}
				if(targetDomRect.bottom < window.innerHeight) {
					document.body.style.overflow = 'hidden';
					window.scrollTo( 0, 0 );
				}
				if(targetDomRect.right >= window.innerWidth || markerBody.style.display === 'block') {
					document.body.style.overflow = 'scroll';
					window.scrollTo(1000, 1000);
				}
				if(targetDomRect.bottom >= window.innerHeight || markerBody.style.display === 'block') {
					document.body.style.overflow = 'scroll';
					window.scrollTo( 1000, 1000 );
				}
			}
		}
	}

	// Режим комментирования активирован
	function activateModeComment() {
		console.log('Режим комментирования активирован');
		let canvas = document.querySelector('canvas');
		for(let commentsForm of app.querySelectorAll('.comments__form')) {
			commentsForm.addEventListener('click', function(e) {
				e.stopPropagation();
			});
		}	
		app.addEventListener('click', createNewComment);
		// включить отправку сообщений
		let commentsFormAll = app.querySelectorAll('.comments__form')
		for(let commentsForm of commentsFormAll) {
			let commentsBody = commentsForm.querySelector('.comments__body');
			let commentsInput = commentsBody.querySelector('.comments__input');
			let commentsSubmit = commentsBody.querySelector('.comments__submit');
			commentsInput.style.display = 'inline-block';
			commentsSubmit.style.display = 'inline-block';
		}
	}

	// Режим комментирования отключен
	function stopModeComment() {
		console.log('Режим комментирования отключен');
		app.removeEventListener('click', createNewComment);
		// прерываем создание нового комментария
		let commentFormAll = app.querySelectorAll('.comments__form');
		if(commentFormAll.length === 0) {
			return;
		} else {
			let commentFormLast = commentFormAll[commentFormAll.length -1 ];
			if(commentFormLast.querySelector('.comments__body').children.length === 3) {
				commentFormLast.remove();
			}
		}
	}




// ~~~~~~~~~~~~~~~~~~~~~~~~~ РЕЖИМ ПОДЕЛИТЬСЯ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


// Копировать url по кнопке копировать в буфер обмена
const buttonCopy = document.querySelector('.menu_copy');

	buttonCopy.addEventListener('click', function() {
		let copyText = document.querySelector('.menu__url');
		copyText.select();
		document.execCommand("copy");
	});

// Ссылка с сервера к currentImage


// ~~~~~~~~~~~~~~~~~~~~~~~~~~ Загрузка приложения ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

document.addEventListener('DOMContentLoaded', createCanvas);
document.addEventListener('DOMContentLoaded', inputFileHidden);
document.addEventListener('DOMContentLoaded', userSelectsFileTransfer);
document.addEventListener('DOMContentLoaded', startMenuTransfer);
document.addEventListener('DOMContentLoaded', appPublication);
document.addEventListener('DOMContentLoaded', appLink);
// document.addEventListener('DOMContentLoaded', appReload);
document.addEventListener('DOMContentLoaded', onDOMContentLoaded);

function onDOMContentLoaded() {
	// Подписываемся на событие выбора файла 
	const inputFile = document.querySelector('input[type=file]');
	inputFile.addEventListener('change', onFileSelected);
	menuNew.addEventListener('click', onClickMenuNew);
}

// ~~~~~~~~~~~~~~~~~~~~~~~~~~ Перезагрузка приложения ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

function appReload() {
	if (sessionStorage.getItem("is_reloaded")) {
		console.log('Страница перезагружена');
		// interfaceAppReload();
	}
	sessionStorage.setItem("is_reloaded", true);

	// Сохраняем настройки приложения (интерфейс appReload)
}


// ~~~~~~~~~~~~~~~~~~~~~~~~ Вход в приложение из режима поделиться - по ссылке ~~~~~~~~~~~~~~~~~~~~~~

function appLink() {
	let appIndexLink = 'file:///C:/Web%20%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%BA%D0%B0/%D0%9D%D0%B5%D1%82%D0%BE%D0%BB%D0%BE%D0%B3%D0%B8%D1%8F%20-%D0%92%D0%B5%D0%B1-%D1%80%D0%B0%D0%B7%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D1%87%D0%B8%D0%BA%20(%D0%BA%D1%83%D1%80%D1%81%D1%8B)/JS%20%D0%B2%20%D0%B1%D1%80%D0%B0%D1%83%D0%B7%D0%B5%D1%80%D0%B5/%D0%94%D0%B8%D0%BF%D0%BB%D0%BE%D0%BC%D0%BD%D0%B0%D1%8F%20%D1%80%D0%B0%D0%B1%D0%BE%D1%82%D0%B0/index.html';
	appByLink = true;
	if(location.href !== appIndexLink) {
		// alert('Приложение перешло по ссылке');
		appReview();
		canvas.style.display = 'none';
		// if(app.querySelector('.current-image').src === '') {

		// }
		currentImage.style.display = 'block';
		currentImageId = location.href.split('?')[1];
		console.log(currentImageId);

		connectionWebSocket = new WebSocket('wss://neto-api.herokuapp.com/pic/' + currentImageId);

		connectionWebSocket.onmessage = function(e) {
			let response = JSON.parse(e.data);
			console.log(response);
			if(response.event === 'mask') {
				// Обновляем ссылку на изображение (с новыми данными)
				currentImage.src = response.url;
			}
			if(response.event === 'comment') {
				console.log(response.comment);
				console.log(response);
				// Обновляем все комментарии (вызывается функция внутри setComments)
				requestImage(currentImageId);
			}
		}

		connectionWebSocket.onopen = function(e) {
			// alert('WebSocket соединение открыто');
		}

		connectionWebSocket.onclose = function(e) {
			// alert('WebSocket соединение закрыто');
		}

		requestImage(currentImageId);
		menuUrl.value = location.href;

		// подгрузить все комментарии текущей картинки с сервера
	}
}

function setImage(response) {
	currentImage.src = response.url;
	if(response.mask !== undefined) {
		currentImage.src = response.mask;
	}
}

// Обновление комментариев с сервера
function setComments(response) {

	let commentSnippet = `<div class="comment">
    <p class="comment__time"></p>
    <p class="comment__message"></p>
  </div>`;

	if(response.comments !== undefined) {
			// подгружаем комментарии

			let dataComments = Object.values(response.comments);

			for(let i = 0; i < dataComments.length; i++) {
			let message = dataComments[i].message;
			let timestamp = dataComments[i].timestamp;
			let left = dataComments[i].left;
			let top = dataComments[i].top;



			app.insertAdjacentHTML('beforeend', commentNew);

			let commentAll = app.querySelectorAll('.comments__form');
			let commentLast = commentAll[commentAll.length - 1];
			let commentMarker = commentLast.querySelector('.comments__marker');
			let commentBody = commentLast.querySelector('.comments__body');

			commentBody.insertAdjacentHTML('afterbegin', commentSnippet);
			let comment = commentBody.querySelector('.comment');

			let commentsInput = commentBody.querySelector('.comments__input');
			let commentsClose = commentBody.querySelector('.comments__close');
			let commentsSubmit = commentBody.querySelector('.comments__submit');
			commentLast.style.left = left + 'px';
			commentLast.style.top = top + 'px';
			comment.querySelector('.comment__time').textContent = timestamp;
			comment.querySelector('.comment__message').textContent = message;
			commentBody.style.display = 'none';
			commentMarker.style.display = 'block';
			commentMarker.style.zIndex = 1000;

			// на все маркеры вешаем клик показывать/ скрывать тело комменатария

			let forms = app.querySelectorAll('.comments__form');
			for(let form of forms) {
				let marker = form.querySelector('.comments__marker');
				let body = form.querySelector('.comments__body');
				marker.addEventListener('click', function(e) {
					body.style.display = 'block';
				});
			}
		}
	}


}
