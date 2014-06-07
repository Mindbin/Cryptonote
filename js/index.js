/*
 * Created by mindbin
 * www.mindbin.io
*/
var defaultSettings = {
    "selectedServer": 1,
    "servers": [
	{
	    "id": 0,
	    "name": "None",
	    "url": ""
	},
	{
	    "id": 1,
	    "name": "Cryptonote",
	    "url": "http://mindbin.io/Cryptonote/Server/"
	}
    ]
};

$(document).ready(function() {
    /* Variables */
    var loginName = null;
    var password = null;
    var key = null;
    var noteData = null;
    var selectedNote = null;
    var settings = null;
    var server = null;
    var serversBack = "#loginScreen";
    var syncInterval = null;
    
    
    /* Get settings */
    settings = JSON.parse(localStorage.getItem("Settings"));
    if (!settings) settings = defaultSettings;			// initialize settings first time
    populateServerList();
    populateLoginList();
    
    
    /* Login form */
    $("#loginForm").submit(function(e) {
	e.preventDefault();
	loginName = $("#loginInput").val();
	password = $("#passwordInput").val();
	var rememberLogin = $("#rememberLoginCheckbox:checked").val();
	
	if (rememberLogin) {
	    $("#rememberLoginCheckbox").attr("checked",false).checkboxradio("refresh");
	    $("#savedLoginsButton").css("display", "block");
	    
	    var loginId = findNextId(settings.logins);
	    settings.logins.push({id: loginId, login: loginName, password: encrypt(password, loginName)});
	    populateLoginList();
	}
	saveSettings();
	
	login();
	
	$("#loginInput").val("");
	$("#passwordInput").val("");
	$("#loginForm .ui-input-clear").addClass("ui-input-clear-hidden");
    });
    
    
    /* log In function */
    function login() {
	if (!noteData) noteData = new Object(); 
	if (!noteData.notes) noteData.notes = new Array();
	if (!noteData.index) noteData.index = 0;
	if (!noteData.lastsynched) noteData.lastsynched = 0;
		
	setServer();
	key = generateKey(loginName, password);
	
	var encryptedData = localStorage.getItem(key);
	if (encryptedData) {
	    var decryptedData = decrypt(encryptedData, password);
	    if (decryptedData) {
		noteData = JSON.parse(decryptedData);
		populateNoteList();
		contactServer();
		$(":mobile-pagecontainer").pagecontainer("change", "#mainScreen", {transition: "flow"});
	    } else {
		alert("Incorrect password");
	    }
	} else { // new user
	    $(":mobile-pagecontainer").pagecontainer("change", "#mainScreen", {transition: "flow"});
	}
    }
    

    /* log Out function */	
    function logOut() {
	loginName = null;
	password = null;
	key = null;
	noteData = null;
	selectedNote = null;
	$("#titleValue").val("");
	$("#noteValue").val("");
	$("#noteTimestamp").html("");
	
	$(":mobile-pagecontainer").pagecontainer("change", "#loginScreen", {transition: "flow", reverse: true});
	$("#noteList").empty(); // clear the list
	clearInterval(syncInterval);
	$("#syncButton").css("display", "none");
    }
    
    
    /* server List */
    function populateServerList(edit) {
	$("#serverList").empty();
	if (edit) {
	    $("#serverList").append("<li data-icon=\"plus\" serverId=\"new\"><a href=\"#\">Add New</a></li>");
	    $.each(settings.servers, function(key, val) {
		if (val.id>0) {
		    $("#serverList").append("<li data-icon=\"carat-r\" serverId=\""+val.id+"\"><a href=\"#\">"+val.name+"</a></li>");
		}
	    });
	    
	    // Click on Server
	    $("#serverList li").each(function() {
		$(this).click(function() {
		    $("#editServerScreen input[name='id']").val($(this).attr("serverId"));

		    var object = findById(settings.servers, $(this).attr("serverId"));
		    if (object) {
			$("#editServerScreen #editServerHeader span.ui-title").html(object.name);
			$("#editServerScreen input[name='name']").val(object.name);
			$("#editServerScreen input[name='url']").val(object.url);
			$("#editServerDeletePopupButton").css("display", "block");
		    } else {
			$("#editServerScreen #editServerHeader span.ui-title").html("Add New");
			$("#editServerScreen input[name='name']").val("");
			$("#editServerScreen input[name='url']").val("");
			$("#editServerDeletePopupButton").css("display", "none");
		    }
		    
		    $(":mobile-pagecontainer").pagecontainer("change", "#editServerScreen", {transition: "flow"});
		});
	    });
	} else {
	    $.each(settings.servers, function(key, val) {
		if (val.id == settings.selectedServer) {
		    $("#serverList").append("<li data-icon=\"check\" serverId=\""+val.id+"\"><a href=\"#\">"+val.name+"</a></li>");
		} else {
		    $("#serverList").append("<li data-icon=\"false\" serverId=\""+val.id+"\"><a href=\"#\">"+val.name+"</a></li>");
		}
	    });
	    
	    // Click on Server
	    $("#serverList li").each(function() {
		$(this).click(function() {
		    settings.selectedServer = $(this).attr("serverId");
		    setServer();
		    populateServerList();
		    saveSettings();
		});
	    });
	}
	$("#serverList").listview().listview("refresh");
    }
    
    function setServer() {
	server = findById(settings.servers, settings.selectedServer);
	
	if (settings.selectedServer > 0) {
	    syncInterval = window.setInterval(contactServer, 60000); // contact server every minute
	    $("#syncButton").css("display", "block");
	} else {
	    clearInterval(syncInterval);
	    $("#syncButton").css("display", "none");
	}
    }
    
    
    /* notes */
    function populateNoteList() {
	$("#noteList").empty(); // clear the list
	if (noteData.notes) {
	    noteData.notes.sort(dynamicSort("-lastedit"));
	    $.each(noteData.notes, function(key, val) {
		if (!val.deleted) {
		    var title = val.title;
		    if (title == "") title = "No title";
		    var timestamp = new Date(val.lastedit*1000);
		    
		    if (selectedNote>0 && val.id == selectedNote) {
			$("#noteList").append("<li class='selected' noteid='"+val.id+"'><a href='#'><h2>"+title+"</h2><p>"+timestamp.format("d/m/y")+"</p></a></li>");
		    } else {
			$("#noteList").append("<li noteid='"+val.id+"'><a href='#'><h2>"+title+"</h2><p>"+timestamp.format("d/m/y")+"</p></a></li>");
		    }
		}
	    });
	    $("#noteList").listview().listview("refresh");
	    
	    // Click on note
	    $("#noteList li").each(function() {
		$(this).click(function() {
		    loadNote($(this).attr("noteid"));
		    populateNoteList();
		});
	    });
	    if (selectedNote>0) loadNote(selectedNote)
	}
    }
    
    
    function loadNote(id) {
	var note = findById(noteData.notes, id);
	if (note) {
	    var timestamp = new Date(note.lastedit*1000);
	    $("#noteTimestamp").html(timestamp.format("d/m/y H:i"));
	    $("#titleValue").val(note.title);
	    $("#noteValue").val(note.content);
	    selectedNote = note.id;
	    $("#noteDeletePopupButton").css("display", "block");
	    $("#noteListPanel").panel("close");
	} else {
	    console.log("Note not found.");
	}
    }
    
    
    /* saved logins */
    function populateLoginList() {
	if (settings.logins) {
	    $("#loginList").empty();
	    $.each(settings.logins, function(key, val) {
		$("#loginList").append("<li loginId=\""+val.id+"\"><a class=\"login\">"+val.login+"</a><a class=\"delete\"></a></li>");
	    });
    
	    $("#loginList li").each(function() {
		$("a.login", this).click(function() {
		    var savedLogin = findById(settings.logins, $(this).parent().attr("loginId"));
		    if (savedLogin) {
			loginName = savedLogin.login;
			password = decrypt(savedLogin.password, loginName);
			
			login();
		    }
		});
		$("a.delete", this).click(function() {
		    settings.logins = removeById(settings.logins, $(this).parent().attr("loginId"));
		    saveSettings();
		    populateLoginList();
		});
	    });
	    $("#loginList").listview().listview("refresh");
	} else {
	    settings.logins = new Array();
	}
	
	if (settings.logins == 0) {
	    $("#savedLoginsButton").css("display", "none");
	} else {
	    $("#savedLoginsButton").css("display", "block");
	}
    }
    
    
    /* saving */
    function saveSettings() {
	localStorage.setItem("Settings", JSON.stringify(settings));
    }
    
    function saveNotes() {
	var encryptedData = encrypt(JSON.stringify(noteData), password);
	localStorage.setItem(key, encryptedData);
	
	return encryptedData;
    }
    
    function saveNote() {
	if (key) {
	    if (selectedNote) {
		var note = findById(noteData.notes, selectedNote);
		if (note) {
		    note.title = $("#titleValue").val();
		    note.content = $("#noteValue").val();
		    note.lastedit = getUnixStamp();
		    noteData.notes = removeById(noteData.notes, note.id);
		    noteData.notes.unshift(note);
		} else {
		    console.log("Note not found.");
		}
	    } else {
		noteData.index += 1;
		selectedNote = noteData.index;
		noteData.notes.unshift({
		    id: noteData.index,
		    created: getUnixStamp(),
		    lastedit: getUnixStamp(),
		    title: $("#titleValue").val(),
		    content: $("#noteValue").val()
		});
	    }
	    
	    populateNoteList();
	    saveNotes();
	} else {
	    $("#titleValue").val("");
	    $("#noteValue").val("");
	    $(":mobile-pagecontainer").pagecontainer("change", "#loginScreen", {transition: "flow", reverse: true});
	}
    }
    
    
    /* synchronization */
    function contactServer() {
	if (settings.selectedServer > 0 && key) {
	    var loginHash = CryptoJS.SHA3(loginName, { outputLength: 256 });
	    
	    $.post(server.url, {action: "get", id: key.toString(), login: loginHash.toString()}, function(data) {
		if (data) {
		    var response = JSON.parse(data);
		    if (response.status == 1) {
			synchronizeData(response.data);
		    } else { // no data on server
			sendDataToServer();
		    }
		} else {
		    console.log("Invalid server");
		}
	    });	
	}
    }
    
    function sendDataToServer() {
	noteData.lastsynched = getUnixStamp();
	var encryptedData = saveNotes();
	
	
	$.post(server.url, {action: "save", id: key.toString(), login: loginHash.toString(), data:encryptedData}, function(data) {
	    if (data) {
		var response = JSON.parse(data);
		if (response.status == 1) {
		    console.log("Sent data");
		}
	    } else {
		console.log("Invalid server");
	    }
	});
    }
    
    function synchronizeData(encryptedData) {
	console.log("Synchronizing data");
	try {
	    var decryptedData = decrypt(encryptedData, password);
	    
	    if (decryptedData) {
		try {
		    var noteDataServer = JSON.parse(decryptedData);
		    
		    for (var i = 1; i <= noteDataServer.index; i++) {
			var noteServer = findById(noteDataServer.notes, i);
			if (noteServer) {
			    if (noteServer.created > noteData.lastsynched) {
				// if the note has been created after the server was last synched (the note must have been created on another device)
				addNote(noteServer);
				console.log("Added Note 1");
			    } else {
				var noteClient = findById(noteData.notes, i);
				if (noteClient) {
				    if (noteClient.created == noteServer.created) {
					if (noteServer.lastedit > noteData.lastsynched && noteClient.lastedit > noteData.lastsynched) {
					    // if the note both on the client and the server has been edited after the last synch, it must have been edited on 2 different devices before the sync, so it should add a new
					    addNote(noteServer);
					    console.log("Added Note 2");
					} else {
					    if (noteServer.lastedit > noteClient.lastedit) {
						noteClient.deleted = noteServer.deleted;
						noteClient.title = noteServer.title;
						noteClient.content = noteServer.content;
						noteClient.lastedit = noteServer.lastedit;
						if (noteClient.deleted) noteClient.content = "";
						
						noteData.notes = removeById(noteData.notes, noteClient.id);
						noteData.notes.unshift(noteClient);	
					    }
					}	
				    } else {
					/* bug: causing a sync loop because of invalid indexes
					addNote(noteServer);
					console.log("Added Note 3");
					*/
				    }
				} else {
				    noteData.notes.unshift(noteServer);
				    if (noteData.index < noteServer.id) noteData.index = noteServer.id; // update index
				}
			    }
			} else {
			    noteData.notes = removeById(noteData.notes, i);
			}
		    }
		    
		    sendDataToServer();
		    populateNoteList();
		} catch(e) {
		    console.log(loginHash.toString());
		    console.log("Invalid JSON from server");
		    
		    if (noteData) {
			sendDataToServer();
		    }
		}
	    }	
	} catch(e) {
	    console.log("Unable to decrypt data");
	}
    }
    
    
    /* Buttons */
    $("#serversButton").click(function() {
	$(":mobile-pagecontainer").pagecontainer("change", "#serversScreen", {transition: "flow"});
	serversBack = "#loginScreen";
    });
    
    $("#serversEditButton").click(function() {
	populateServerList(1);
	$("#serversEditButton").css("display", "none");
	$("#serversDoneButton").css("display", "block");
    });
    
    $("#serversDoneButton").click(function() {
	populateServerList();
	$("#serversEditButton").css("display", "block");
	$("#serversDoneButton").css("display", "none");
    });
    
    $("#editServerSaveButton").click(function() {
	var serverId = $("#editServerForm input[name='id']").val();
	var serverName = $("#editServerForm input[name='name']").val();
	var serverUrl = $("#editServerForm input[name='url']").val();
	
	if (serverId && serverName && serverUrl) {
	    if (serverId == "new") {
		serverId = findNextId(settings.servers);
	    } else {
		settings.servers = removeById(settings.servers, serverId);
	    }
	    settings.servers.push({id: serverId, name: serverName, url: serverUrl})
	    
	    populateServerList(1);
	    saveSettings();
	    
	    $(":mobile-pagecontainer").pagecontainer("change", "#serversScreen", {transition: "flow", reverse: true});
	} else {
	    alert("You must fill in both fields.");
	}
    });
    
    $("#serversBackButton").click(function() {
	populateServerList();
	$("#serversEditButton").css("display", "block");
	$("#serversDoneButton").css("display", "none");
	$(":mobile-pagecontainer").pagecontainer("change", serversBack, {transition: "flow", reverse: true});
    });
    
    $("#editServerBackButton").click(function() {
	$(":mobile-pagecontainer").pagecontainer("change", "#serversScreen", {transition: "flow", reverse: true});
    });
    
    $("#editServerDeletePopupButton").click(function() {
	$("#confirmDeleteServerPopup").popup("open", {positionTo: "#editServerDeletePopupButton", transistion: "pop"});
    });
    
    $("#savedLoginsButton").click(function() {
	$("#savedLoginsPopup").popup("open", {positionTo: "#savedLoginsButton", transistion: "pop"});
    });
    
    $("#deleteServerPopupCancelButton").click(function() {
	$("#confirmDeleteServerPopup").popup("close");
    });
    
    $("#changeServerButton").click(function() {
	$(":mobile-pagecontainer").pagecontainer("change", "#serversScreen", {transition: "flow"});
	serversBack = "#mainScreen";
    });
    
    $("#noteDeletePopupButton").click(function() {
	$("#confirmDeleteNotePopup").popup("open", {positionTo: "#noteDeletePopupButton", transistion: "pop"});
    });
    
    $("#settingsButton").click(function() {
	$("#settingsPopup").popup("open", {positionTo: "#settingsButton", transistion: "pop"});
    });
    
    $("#syncButton").click(function() {
	contactServer();
    });
    
    $("#settingsCancelButton").click(function() {
	$("#settingsPopup").popup("close");
    });
    
    $("#deleteNotePopupCancelButton").click(function() {
	$("#confirmDeleteNotePopup").popup("close");
    });
    
    $("#changePasswordButton").click(function() {
	$(":mobile-pagecontainer").pagecontainer("change", "#changePasswordScreen", {transition: "flow"});
    });
    
    $("#changePasswordBackButton").click(function() {
	$(":mobile-pagecontainer").pagecontainer("change", "#mainScreen", {transition: "flow", reverse: true});
    });
    
    $("#changePasswordSaveButton").click(function() {
	var oldPassword = $("#changePasswordScreen input[name='oldPassword']").val();
	var newPassword1 = $("#changePasswordScreen input[name='newPassword1']").val();
	var newPassword2 = $("#changePasswordScreen input[name='newPassword2']").val();
	
	if (oldPassword == password) {
	    if (newPassword1 == newPassword2) {
		password = newPassword1;
		localStorage.removeItem(key);
		key = generateKey(loginName, password);
		saveNotes();
		$("#changePasswordScreen input[name='oldPassword']").val("");
		$("#changePasswordScreen input[name='newPassword1']").val("");
		$("#changePasswordScreen input[name='newPassword2']").val("");
		$(":mobile-pagecontainer").pagecontainer("change", "#mainScreen", {transition: "flow", reverse: true});
	    } else {
		alert("Passwords does not match");
	    }
	} else {
	    alert("Incorrect password");
	}
    });
    
    $("#editServerDeleteButton").click(function() {
	var serverId = $("#editServerScreen input[name='id']").val();
	settings.servers = removeById(settings.servers, serverId);
	$(":mobile-pagecontainer").pagecontainer("change", "#serversScreen", {transition: "flow", reverse: true});
	populateServerList(1);
	saveSettings();
    });
    
    $("#noteListButton").click(function() {
	$("#noteListPanel").panel("toggle");
    });
    
    $("#newNoteButton").click(function() {
	var timestamp = new Date(getUnixStamp()*1000);
	$("#noteTimestamp").html(timestamp.format("d/m/y H:i"));
	$("#titleValue").val("");
	$("#noteValue").val("");
	selectedNote = null;
	saveNote();
	$("#noteListPanel").panel("close");
    });
    
    $("#deleteNoteButton").click(function() {
	$("#confirmDeleteNotePopup").popup("close");
	$("#titleValue").val("");
	$("#noteValue").val("");
	$("#noteTimestamp").html("");
	$("#noteDeletePopupButton").css("display", "none");
	
	var note = findById(noteData.notes, selectedNote);
	if (note) {
	    note.deleted = 1;
	    note.content = "";
	    note.lastedit = getUnixStamp();
	    noteData.notes = removeById(noteData.notes, note.id);
	    noteData.notes.unshift(note);
	}
	selectedNote = null;
	populateNoteList();
	saveNotes();
    });

    $("#logOutButton").click(function() {
	logOut();
    });
    
    $("#titleValue").on("keyup paste cut", function() {
	saveNote();
    });
    
    $('#noteValue').on("keyup paste cut", function() {
	saveNote();
    });
    
    $("#loginInput").on("keydown keyup change", function() {
	if ($(this).val().length>0||settings.logins == 0) {
	    $("#savedLoginsButton").css("display", "none");
	} else {
	    $("#savedLoginsButton").css("display", "block");
	}
    });
    
    
    /* FastClick + bugfix with panel*/
    FastClick.attach(document.body);
    $('#noteListPanel').panel({classes: {modal: 'needsclick ui-panel-dismiss'}})
    
    
    /* resizing of textarea */
    $("#noteValue").height($(window).height() - $("#noteValue").offset().top - 145);
    $(window).on("resize", function(e) {
	$("#noteValue").height($(window).height() - $("#noteValue").offset().top - 50);
    });
    
    
    /* note Editor */
    /*var noteEditor = new wysihtml5.Editor("noteValue", {
	name: "noteEditor",
	allowObjectResizing: true,
	supportTouchDevices:  true,
	parserRules: wysihtml5ParserRules
    });
    
    noteEditor.on('change:composer', function() {
	$('#noteValue').keyup()
    });*/

    
    /* other functions */
    function addNote(note) {
	noteData.index += 1;
	note.id = noteData.index;
	noteData.notes.unshift(note);
    }
    
    function findById(source, id) {
	return source.filter(function( obj ) {
	    return +obj.id === +id;
	})[0];
    }
    
    function findNextId(source) {
	var id = 0;
	$.each(source, function(key, val) {
	    if (val.id>id) {
		id = val.id;
	    }
	});
	return id+1;
    }
    
    function removeById(source, id) {
	for (var i = 0; i < source.length; i++) {
	    if (source[i].id == id) {
		source.splice(i, 1);
	    }
	}
	
	return source;
    }
    
    function dynamicSort(property) {
	var sortOrder = 1;
	if(property[0] === "-") {
	    sortOrder = -1;
	    property = property.substr(1);
	}
	return function (a,b) {
	    var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;
	    return result * sortOrder;
	}
    }
    
    function getUnixStamp() {
	return Math.round(new Date().getTime() / 1000);
    }
    
    function generateKey(loginName, password) {
	loginHash = CryptoJS.SHA3(loginName, { outputLength: 256 });
	passwordHash = CryptoJS.SHA3(password, { outputLength: 256 });
	
	return CryptoJS.SHA3(loginHash.toString()+passwordHash.toString(), { outputLength: 512 });
    }
    
    function encrypt(m, k) {
	var e = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(m), k).toString();
	return e;
    }
    
    function decrypt(m, k) { 
	return CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(m, k)).toString();
    }	
});