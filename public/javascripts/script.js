$(document).ready(function(){
	$(".container").height($(window).height()-15); 
	$('#upload-progress').hide();
	$('#progress').on('click', function() {
		$('#upload-button').click();
	});
	$('#upload-button').on('click', function() {
		$('#upload-file').click();
		//$('#upload-progress').text('0%');
		//$('#upload-progress').width('0%');		
	});
	
	$('#upload-file').on('change', function(){
		$('#progress span').text('');
		$('#progress').off("click");
		$('#upload-progress').text('0%');
		$('#upload-progress').toggle();
		
		var file = $(this).get(0).files[0];
		var formData = new FormData();
		formData.append('uploads[]', file, file.name);
		
		$.ajax({
			url: '/upload',
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: function(data){
				console.log(data);
                $(location).attr('href',"/o/" + data.id + "/");
			},
			xhr: function() {
				var xhr = new XMLHttpRequest();
				xhr.upload.addEventListener('progress', function(evt) {
					if (evt.lengthComputable) {
						var percentage = evt.loaded / evt.total;
						percentage = parseInt(percentage * 100);

						$('#upload-progress').text(percentage + '%');
						$('#upload-progress').width(percentage + '%');

						if (percentage === 100) {
							$('#upload-progress').html('Done');
						}
					}
				}, false);
			return xhr;
			}
		});
	});
});