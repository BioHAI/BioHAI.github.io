/*
	Dopetrope by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var	$window = $(window),
		$body = $('body');

	// Breakpoints.
		breakpoints({
			xlarge:  [ '1281px',  '1680px' ],
			large:   [ '981px',   '1280px' ],
			medium:  [ '737px',   '980px'  ],
			small:   [ null,      '736px'  ]
		});

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Dropdowns.
		$('#nav > ul').dropotron({
			mode: 'fade',
			noOpenerFade: true,
			alignment: 'center'
		});

	// Nav.

		// Title Bar.
			$(
				'<div id="titleBar">' +
					'<a href="#navPanel" class="toggle"></a>' +
				'</div>'
			)
				.appendTo($body);

		// Panel.
			$(
				'<div id="navPanel">' +
					'<nav>' +
						$('#nav').navList() +
					'</nav>' +
				'</div>'
			)
				.appendTo($body)
				.panel({
					delay: 500,
					hideOnClick: true,
					hideOnSwipe: true,
					resetScroll: true,
					resetForms: true,
					side: 'left',
					target: $body,
					visibleClass: 'navPanel-visible'
				});

		// Button
		//     $('.button').click( function () {
		//     	$('#ewm').show();
		//     })

		//     $window.on('click', function(e) {
		// 	var src = e.target;
  //              if(src.id && src.id =="ewm"){
  //                  return false;
  //              }else{
  //                  $('#ewm').hide();
  //              }
		// });


})(jQuery);

// var myDiv = $("#ewm");

// $(function() {
//     $(".button-focus").click(function(event) {
//         // showDiv();//调用显示DIV方法
//         $(myDiv).toggle();

//         $(document).one("click",
//         function() { //对document绑定一个影藏Div方法
//             $(myDiv).hide();

//         });

//         event.stopPropagation(); //阻止事件向上冒泡
//     });
//     $(myDiv).click(function(event) {

//         event.stopPropagation(); //阻止事件向上冒泡
//     });
// });　　　　
// function showDiv() {
//     $(myDiv).fadeIn();
// }