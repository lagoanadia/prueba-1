// Diccionario español → inglés de la interfaz. Las claves son el texto tal cual sale en español;
// {0}, {1}… son números (p. ej. "{0} de {1} tareas" sirve para "3 de 12 tareas").
const EN = {
  // ---- Navegación y general
  'Inicio': 'Home', 'Estudios': 'Studies', 'Salud': 'Health', 'Journal': 'Journal', 'Trabajo': 'Work', 'Comida': 'Food', 'Calendario': 'Calendar', 'Perfil': 'Profile',
  'Ajustes del perfil': 'Profile settings', 'Navegación': 'Navigation', 'Mostrar menú': 'Show menu', 'Ocultar menú': 'Hide menu',
  'Hola': 'Hi', 'Hola,': 'Hi,', 'Organiza tu día hablando.': 'Organise your day by talking.', 'Cerrar sesión': 'Sign out', 'Cargando': 'Loading',
  'Algo ha fallado': 'Something went wrong', 'No se ha podido cargar el login de Google': 'Google sign-in could not load',
  'Hoy': 'Today', 'hoy': 'today', 'mañana': 'tomorrow', 'ayer': 'yesterday', 'anoche': 'last night', 'Ayer': 'Yesterday', 'Mañana': 'Tomorrow',
  'Guardar': 'Save', 'Cancelar': 'Cancel', 'Cerrar': 'Close', 'Borrar': 'Delete', 'Eliminar': 'Delete', 'Quitar': 'Remove', 'Añadir': 'Add', 'Crear': 'Create', 'Editar': 'Edit',
  'Listo': 'Done', 'Hecho': 'Done', 'Hecha': 'Done', 'Ver': 'View', 'Volver': 'Back', 'Atrás': 'Back', 'Siguiente': 'Next', 'Anterior': 'Previous', 'Saltar': 'Skip',
  'Aceptar': 'Accept', 'Rechazar': 'Decline', 'Más': 'More', 'Menos': 'Less', 'Todo': 'All', 'Nada': 'Nothing', 'Vacío': 'Empty', 'Duplicar': 'Duplicate', 'Sí, confirmar': 'Yes, confirm', 'No': 'No',
  'Personalizar': 'Customise', 'Personalizar tablero': 'Customise board', 'Terminar de personalizar': 'Finish customising', 'Widgets': 'Widgets', 'Añadir widget': 'Add widget', 'Añadir bloque': 'Add block',
  'Arrastra un widget a tu tablero': 'Drag a widget onto your board', 'Pequeño': 'Small', 'Vertical': 'Tall', 'Ancho': 'Wide', 'Grande': 'Large', 'Estrecho': 'Narrow', 'Mediano': 'Medium',
  'Mover antes': 'Move earlier', 'Mover después': 'Move later', 'Cambiar tamaño': 'Resize', 'Tamaño de {0}': 'Size of {0}', 'Ya están todos': 'All added already',
  'Toca para editar': 'Tap to edit', 'Toca para cambiar': 'Tap to change', 'Toca para abrir': 'Tap to open', 'Toca para marcar hoy': 'Tap to mark today',
  'Vencida': 'Overdue', 'Pendiente': 'Pending', 'Pendientes': 'To do', 'En proceso': 'In progress', 'Completadas': 'Done', 'Hechas': 'Done',
  'Fecha': 'Date', 'Fecha límite': 'Deadline', 'Sin plazo': 'No deadline', 'Para': 'For', 'Para quién': 'For whom', 'Nota': 'Note', 'Notas': 'Notes', 'Nota rápida': 'Quick note',
  'Escribe lo que quieras': 'Write anything', 'Borrar nota': 'Delete note', '¿Borrar esta nota?': 'Delete this note?', 'Formato de la nota': 'Note formatting', 'Color': 'Colour', 'Cambiar color': 'Change colour',
  'Puntos': 'Bullets', 'Negrita': 'Bold', 'Cursiva': 'Italic', 'Subrayado': 'Underline', 'Ideas': 'Ideas', 'Tu día': 'Your day', 'Desliza para ver tu día': 'Swipe to see your day',
  'Lunes': 'Monday', 'Martes': 'Tuesday', 'Miércoles': 'Wednesday', 'Jueves': 'Thursday', 'Viernes': 'Friday', 'Sábado': 'Saturday', 'Domingo': 'Sunday',
  'Mié': 'Wed', 'Sáb': 'Sat', 'Día': 'Day', 'Semana': 'Week', 'Mes': 'Month', 'Año': 'Year', 'año': 'year', 'Últimos 7 días': 'Last 7 days',
  'min': 'min', '{0} min': '{0} min', '{0} h': '{0} h', '1 día': '1 day', '{0} días': '{0} days', 'en {0} días': 'in {0} days', 'hace {0} días': '{0} days ago', '{0} días tarde': '{0} days late',
  'Historial': 'History', 'Aún no hay días anteriores': 'No previous days yet',

  // ---- Inicio
  '¿Qué toca hoy?': "What's on today?", 'Tareas de hoy': "Today's tasks", 'Hoy no tienes tareas: el día está libre': 'No tasks today: your day is free',
  'Tareas tachadas': 'Crossed-off tasks', 'Recuperar': 'Restore', 'Recuperar tareas tachadas': 'Restore crossed-off tasks', 'Marcar hecho': 'Mark done', 'Marcar pendiente': 'Mark pending',

  // ---- Voz
  'Hablar': 'Talk', 'Hablar con el asistente': 'Talk to the assistant', 'Asistente de voz': 'Voice assistant', 'Te estoy escuchando': "I'm listening", 'Dejar de escuchar': 'Stop listening',
  'Toca el círculo para hablar': 'Tap the circle to talk', 'Toca el círculo y cuéntame': 'Tap the circle and tell me', 'Transcripción': 'Transcript', 'Pulsa confirmar o di «sí»': 'Press confirm or say "yes"',
  '¡Apuntado!': 'Saved!', 'No he podido transcribir el audio': "I couldn't transcribe the audio", 'No puedo acceder al micrófono. Dale permiso en el navegador.': "I can't access the microphone. Allow it in your browser.",

  // ---- Perfil y avatar
  'Avatar': 'Avatar', 'Aleatorio': 'Random', 'Avatar aleatorio': 'Random avatar', 'Cara': 'Face', 'Pelo': 'Hair', 'Gafas': 'Glasses', 'Extras': 'Extras', 'Ropa': 'Clothes', 'Fondo': 'Background',
  'Piel': 'Skin', 'Ojos': 'Eyes', 'Cejas': 'Brows', 'Boca': 'Mouth', 'PIEL': 'SKIN', 'OJOS': 'EYES', 'CEJAS': 'BROWS', 'BOCA': 'MOUTH',
  'Ocultar nombres de la barra lateral': 'Hide sidebar labels', 'Solo se ven los iconos': 'Only icons are shown', 'Así queda tu barra lateral': 'Your sidebar will look like this',
  'Solo Inicio, Calendario y Perfil.': 'Only Home, Calendar and Profile.', 'Activar {0}': 'Turn on {0}', 'Desactivar {0}': 'Turn off {0}',
  'Asignaturas, temario, apuntes y progreso': 'Subjects, syllabus, notes and progress', 'Planificación semanal, pasos y deportes': 'Weekly planning, steps and sports',
  'Mood, metas, cápsulas del tiempo y pixels': 'Mood, goals, time capsules and pixels', 'Proyectos, tareas y prioridades': 'Projects, tasks and priorities', 'Menú semanal, recetario y compra': 'Weekly menu, recipes and shopping',
  'Idioma': 'Language', 'Español': 'Español', 'English': 'English',
  // Opciones del avatar
  'Corto': 'Short', 'Ondulado': 'Wavy', 'Largo': 'Long', 'Bob': 'Bob', 'Flequillo': 'Fringe', 'Pincho': 'Spiky', 'Coleta': 'Ponytail', 'Moño': 'Bun', 'Rizo corto': 'Short curls', 'Rizo media melena': 'Mid curls', 'Rizo largo': 'Long curls',
  'Rizo corto con flequillo': 'Short curls with fringe', 'Rizo media melena con flequillo': 'Mid curls with fringe', 'Rizo largo con flequillo': 'Long curls with fringe', 'Afro': 'Afro', 'Rapado': 'Buzz cut', 'Calva': 'Bald',
  'Barba': 'Beard', 'Bigote': 'Moustache', 'Sombra': 'Stubble', 'Sin gafas': 'No glasses', 'Redondas': 'Round', 'Cuadradas': 'Square', 'De sol': 'Sunglasses', 'Corazón': 'Heart',
  'Pendientes de aro': 'Earrings', 'Diadema': 'Headband', 'Flor': 'Flower', 'Gorra': 'Cap', 'Gorro': 'Beanie', 'Cascos': 'Headphones', 'Corona': 'Crown',
  'Camiseta': 'T-shirt', 'Cuello pico': 'V-neck', 'Cuello alto': 'Turtleneck', 'Camisa': 'Shirt', 'Sudadera': 'Hoodie', 'Jersey': 'Sweater', 'Deporte': 'Sport', 'Chef': 'Chef', 'Traje': 'Suit', 'Rayas': 'Stripes', 'Lunares': 'Polka dots', 'Peto': 'Overalls', 'Esmoquin': 'Tuxedo',
  'Feliz': 'Happy', 'Guiño': 'Wink', 'Dormida': 'Sleepy', 'Estrellas': 'Stars', 'Pestañas': 'Lashes', 'KO': 'KO', 'Pícara': 'Cheeky', 'Seria': 'Serious', 'Sonrisa': 'Smile', 'Risa': 'Laugh', 'Carcajada': 'Big laugh', 'Lengua': 'Tongue', 'Sorpresa': 'Surprise', 'Puchero': 'Pout', '¡Oh!': 'Oh!',
  'Suaves': 'Soft', 'Marcadas': 'Bold', 'Enfadada': 'Angry', 'Preocupada': 'Worried', 'Sin cejas': 'No brows', 'Ondas': 'Waves',

  // ---- Amigos
  'Amigos': 'Friends', 'Tu nombre de usuario': 'Your username', 'tu_nombre': 'your_name', 'Cambiar': 'Change', 'Elige tu nombre para añadir amigos': 'Pick a username to add friends',
  'nombre de tu amigo': "friend's username", 'Nombre de usuario del amigo': "Friend's username", 'Peticiones de amistad': 'Friend requests', 'quiere ser tu amigo': 'wants to be your friend',
  '¡Ya sois amigos!': "You're friends now!", 'Petición enviada a @{0}': 'Request sent to @{0}', 'Cancelar petición a @{0}': 'Cancel request to @{0}', 'Quitar a @{0}': 'Remove @{0}',
  'No hay nadie con ese nombre': 'Nobody has that username', 'Ese eres tú': "That's you", 'Ese nombre ya está cogido': 'That username is taken', 'Elige antes tu nombre de usuario': 'Pick your username first',
  'De 3 a 20 letras minúsculas, números, punto o guion bajo': '3 to 20 lowercase letters, numbers, dots or underscores', 'Has llegado al máximo de amigos': "You've reached the friend limit",
  '{0} peticiones de amistad': '{0} friend requests',

  // ---- Calendario
  'Nuevo evento': 'New event', '+ Nuevo evento': '+ New event', 'Evento': 'Event', 'Cumpleaños': 'Birthday', 'cumpleaños': 'birthday', 'Entrega': 'Deadline', 'Tarea': 'Task', 'Título': 'Title',
  'Nada este día.': 'Nothing on this day.', '+{0} más': '+{0} more', 'Mamá': 'Mum', 'Viaje a Lisboa': 'Trip to Lisbon', '¿Qué cumpleaños no quieres olvidar?': "Which birthdays don't you want to forget?",
  '¿Alguna fecha importante pronto?': 'Any important dates coming up?',

  // ---- Onboarding
  '¿Qué asignaturas tienes?': 'Which subjects are you taking?', '¿A qué hora empiezan tus clases?': 'What time do your classes start?', '¿Cuánto dura cada clase?': 'How long is each class?', '¿Tienes alguna entrega pronto?': 'Any deadlines coming up?',
  '¿Qué deportes haces?': 'Which sports do you do?', '¿Qué días entrenas?': 'Which days do you train?', '¿Cuánto quieres moverte a la semana?': 'How much do you want to move per week?', '¿Cuántos vasos de agua al día?': 'How many glasses of water a day?', '¿Cuántas horas quieres dormir?': 'How many hours do you want to sleep?',
  '¿Qué hábitos quieres seguir?': 'Which habits do you want to track?', '¿Alguna meta para este año?': 'Any goals for this year?', '¿En qué proyectos estás?': 'Which projects are you working on?', '¿Cuánto dura tu bloque de concentración?': 'How long is your focus block?',
  '¿Qué comidas quieres planificar?': 'Which meals do you want to plan?', '¿Qué platos sueles cocinar?': 'Which dishes do you usually cook?', '¿Qué día haces batch cooking?': 'Which day do you batch cook?', '¿Qué cuenta en tu progreso?': 'What counts towards your progress?',
  'Otro deporte': 'Other sport', '+ Otro deporte': '+ Other sport', 'Otro hábito': 'Other habit', '+ Otro hábito': '+ Other habit', 'Otro plato': 'Other dish', '+ Otro plato': '+ Other dish', 'No hago': "I don't", 'Empezar': 'Start',
  'Beber agua': 'Drink water', 'Leer': 'Read', 'Meditar': 'Meditate', 'Sin móvil antes de dormir': 'No phone before bed', 'Ir al gimnasio': 'Go to the gym', 'Leer 12 libros': 'Read 12 books', 'Web para un cliente': 'Website for a client',
  'Gimnasio': 'Gym', 'Natación': 'Swimming', 'Correr': 'Run', 'Caminar': 'Walking', 'Yoga': 'Yoga', 'Pilates': 'Pilates', 'Ciclismo': 'Cycling', 'Senderismo': 'Hiking', 'Escalada': 'Climbing', 'Descanso': 'Rest', 'Fútbol': 'Football', 'Baloncesto': 'Basketball', 'Tenis': 'Tennis', 'Pádel': 'Padel', 'Boxeo': 'Boxing', 'Baile': 'Dancing',

  // ---- Journal
  'Mood tracker': 'Mood tracker', 'Bueno': 'Good', 'Mejorable': 'Could be better', 'Malo': 'Bad', 'Metas': 'Goals', 'Pixels': 'Pixels', 'Palabra del día': 'Word of the day', 'Cápsulas del tiempo': 'Time capsules', 'Una cosa buena del día': 'One good thing today',
  'Sin metas': 'No goals', 'Nueva meta': 'New goal', 'Crear meta': 'Create goal', 'Tu meta': 'Your goal', '¿Qué quieres conseguir?': 'What do you want to achieve?', '¿Cuánto?': 'How much?', '¿De qué?': 'Of what?',
  'Leer, correr, ahorrar…': 'Read, run, save…', 'libros, km, veces…': 'books, km, times…', 'Objetivo': 'Target', '{0} de {1}': '{0} of {1}', '{0}/{1}': '{0}/{1}',
  'Leer · 12 libros': 'Read · 12 books', 'Correr · 100 km': 'Run · 100 km', 'Ir al gimnasio · 50 veces': 'Go to the gym · 50 times', 'Ahorrar · 500 €': 'Save · 500 €', 'Aprender palabras · 300 palabras': 'Learn words · 300 words',
  '{0} de {1} libros': '{0} of {1} books', '{0}/{1} libros': '{0}/{1} books', '{0} de {1} veces': '{0} of {1} times', '{0}/{1} veces': '{0}/{1} times', '{0} de {1} km': '{0} of {1} km', '{0}/{1} km': '{0}/{1} km',
  'Sin hábitos': 'No habits', 'Nuevo hábito': 'New habit', 'Añadir hábito': 'Add habit', 'Leer, meditar…': 'Read, meditate…', '{0} d': '{0} d',
  'Nueva cápsula': 'New capsule', 'Sin cápsulas': 'No capsules', 'Abrir': 'Open', 'Abrir cápsula': 'Open capsule', 'Cápsula abierta': 'Opened capsule', 'Cápsulas abiertas': 'Opened capsules', 'Aún no has abierto ninguna': "You haven't opened any yet",
  'Sellar': 'Seal', 'Enviar': 'Send', 'Solo yo (privada)': 'Just me (private)', 'Se abre el': 'Opens on', 'Escribe tu primera cápsula con el +': 'Write your first capsule with +',
  'Escribe a tu yo del futuro. La botella quedará cerrada hasta la fecha que elijas.': 'Write to your future self. The bottle stays sealed until the date you choose.',
  '{0} lista para abrir · {1} cerradas': '{0} ready to open · {1} sealed', '{0} listas para abrir · {1} cerradas': '{0} ready to open · {1} sealed', '{0} cerradas': '{0} sealed', '{0} cerrada': '{0} sealed', '1 lista para abrir · ': '1 ready to open · ',
  '¿Algo bueno hoy?': 'Anything good today?', '¿Qué ha salido bien hoy?': 'What went well today?', 'Cosas buenas': 'Good things', 'Editar la cosa buena de hoy': "Edit today's good thing",
  'Palabra del día: escribe tu intento': 'Word of the day: type your guess', '¡Acertada!': 'Got it!', 'Toca y escribe con el teclado': 'Tap and type with the keyboard',

  // ---- Salud
  'Plan semanal': 'Weekly plan', 'Entrenamientos': 'Workouts', 'Evolución': 'Progress', 'Agua': 'Water', 'Sueño': 'Sleep', 'Mis deportes': 'My sports', '← Semana': '← Week', '+ Deporte': '+ Sport',
  'Nada hoy todavía': 'Nothing today yet', 'Notas (opcional)': 'Notes (optional)', 'min hoy': 'min today', '{0} min hoy': '{0} min today', 'Bajar objetivo': 'Lower target', 'Subir objetivo': 'Raise target',
  '{0} de {1} vasos': '{0} of {1} glasses', 'Añadir vaso ({0} de {1})': 'Add a glass ({0} of {1})', '{0} vasos': '{0} glasses', 'Deporte del {0}': 'Sport for {0}',

  // ---- Comida
  'Menú semanal': 'Weekly menu', 'Mis platos': 'My dishes', 'Receta': 'Recipe', 'Lista de la compra': 'Shopping list', 'Batch cooking': 'Batch cooking',
  'Desayuno': 'Breakfast', 'Media mañana': 'Mid-morning', 'Merienda': 'Afternoon snack', 'Cena': 'Dinner', 'Comer fuera': 'Eating out', '+ Desayuno': '+ Breakfast', '+ Merienda': '+ Snack', '− Desayuno': '− Breakfast', '− Merienda': '− Snack',
  'Ingredientes': 'Ingredients', 'Preparación': 'Method', '+ ingrediente': '+ ingredient', '+ paso': '+ step', 'Sin platos': 'No dishes', 'Nuevo plato': 'New dish', 'Nombre del plato': 'Dish name',
  '+ Añadir a la lista': '+ Add to the list', 'Planifica el menú y aparecerá aquí': 'Plan the menu and it will show up here', 'por comprar': 'to buy', 'Nada planificado': 'Nothing planned', 'platos': 'dishes', '{0} platos': '{0} dishes',
  '{0} raciones para lo que queda de semana': '{0} portions for the rest of the week', '{0} raciones · {1}/{2} hechas': '{0} portions · {1}/{2} done',
  'Curry de garbanzos con arroz': 'Chickpea curry with rice', 'Salmón al horno con patata': 'Baked salmon with potatoes', 'Pasta con verduras y tofu': 'Pasta with vegetables and tofu', 'Ensalada de quinoa': 'Quinoa salad', 'Tortitas de avena': 'Oat pancakes', 'Yogur con fruta y nueces': 'Yoghurt with fruit and nuts',

  // ---- Trabajo
  'Proyectos': 'Projects', 'Proyecto': 'Project', 'Tablero': 'Board', 'Agenda': 'Agenda', 'Herramientas': 'Tools', 'Foco': 'Focus', 'Hitos': 'Milestones', 'Hito': 'Milestone', 'Documentos': 'Documents', 'Tiempo': 'Time', 'Reuniones': 'Meetings', 'Enlaces': 'Links', 'Resumen': 'Summary',
  'Nuevo proyecto': 'New project', 'Crear proyecto': 'Create project', 'Nombre del proyecto': 'Project name', 'Abrir proyecto': 'Open project', 'Crea un proyecto para empezar': 'Create a project to get started',
  'Nueva tarea': 'New task', 'Añadir tarea': 'Add task', 'Fecha de la tarea': 'Task date', 'Prioridad': 'Priority', 'Alta': 'High', 'Media': 'Medium', 'Baja': 'Low', 'Notas, enlaces, detalles…': 'Notes, links, details…', '+ Subtarea': '+ Subtask', 'Borrar tarea': 'Delete task',
  '{0}/{1} subtareas': '{0}/{1} subtasks', 'Vencida · {0}': 'Overdue · {0}', 'Arrastra para cambiar de columna · toca para editar': 'Drag to change column · tap to edit', 'Proyectos en el tablero': 'Projects on the board',
  'tareas': 'tasks', 'dedicadas': 'spent', 'reuniones': 'meetings', '{0} d tarde': '{0} d late', '{0} d': '{0} d', 'Color del proyecto': 'Project colour', 'Fecha límite de {0}': 'Deadline for {0}',
  'Próximo:': 'Next:', 'Sin hitos todavía': 'No milestones yet', 'Todos los hitos cumplidos': 'All milestones reached', 'Añadir hito': 'Add milestone', 'Nombre del hito': 'Milestone name', 'Fecha del hito': 'Milestone date', 'Demo, entrega, lanzamiento…': 'Demo, delivery, launch…', 'Cumplido': 'Done', 'Borrar hito': 'Delete milestone',
  'Toca para apuntar algo': 'Tap to add something', 'Reunión con…': 'Meeting with…', 'Empieza': 'Starts', 'Acaba': 'Ends',
  'Pega el enlace (drive.google.com…)': 'Paste the link (drive.google.com…)', 'Añadir herramienta': 'Add tool', 'Ese enlace no es válido': "That link isn't valid", 'Enlaces del proyecto': 'Project links',
  'empezar': 'start', 'parar': 'stop', '{0} esta semana': '{0} this week', '{0} h {1} esta semana': '{0} h {1} this week', '{0} min esta semana': '{0} min this week', 'Tiempo dedicado': 'Time spent', 'Reuniones próximas': 'Upcoming meetings', 'Próximas reuniones': 'Upcoming meetings',
  'Apúntalas en la agenda con el color del proyecto': "Add them to the agenda with the project's colour",
  'Nuevo documento': 'New document', 'Actas, briefing, presupuestos…': 'Minutes, briefs, quotes…', '{0} documentos': '{0} documents', '1 documento': '1 document', 'Borrar documento': 'Delete document', '¿Borrar este documento?': 'Delete this document?', 'Editado {0}': 'Edited {0}',
  'En blanco': 'Blank', 'Empieza desde cero': 'Start from scratch', 'Acta de reunión': 'Meeting minutes', 'Asistentes, temas, acuerdos y siguientes pasos': 'Attendees, topics, agreements and next steps', 'Briefing': 'Brief', 'Objetivo, público, alcance y entregables': 'Goal, audience, scope and deliverables',
  'Presupuesto': 'Quote', 'Conceptos, horas, precio y condiciones': 'Items, hours, price and terms', 'Informe semanal': 'Weekly report', 'Hecho, en curso, bloqueos y próxima semana': 'Done, in progress, blockers and next week', 'Retrospectiva': 'Retrospective', 'Qué fue bien, qué mejorar y acciones': 'What went well, what to improve and actions',
  'Escribe «/» para insertar un bloque': 'Type "/" to insert a block', 'Se guarda solo': 'Saves automatically', 'Texto': 'Text', 'Título 1': 'Heading 1', 'Título 2': 'Heading 2', 'Título 3': 'Heading 3', 'Lista con puntos': 'Bulleted list', 'Lista numerada': 'Numbered list', 'Tareas': 'Tasks', 'Cita': 'Quote', 'Destacado': 'Callout', 'Código': 'Code', 'Divisor': 'Divider',
  'Tipo de bloque': 'Block type', 'Añadir bloque debajo': 'Add block below', 'Arrastra para mover': 'Drag to move', 'Arrastra para mover · pulsa para opciones': 'Drag to move · click for options', 'Sin resultados': 'No results',
  'Prioridades de hoy': "Today's priorities", 'Próximas entregas': 'Upcoming deadlines',

  // ---- Estudios
  'Asignaturas': 'Subjects', 'Asignatura': 'Subject', 'Añadir asignatura': 'Add subject', 'Nueva asignatura': 'New subject', 'Eliminar asignatura': 'Delete subject', 'Sin asignatura': 'No subject', 'Sin nada todavía': 'Nothing yet',
  'Temario': 'Syllabus', 'Temas': 'Topics', 'Tema': 'Topic', 'Añadir tema': 'Add topic', 'Nombre del tema': 'Topic name', 'Sin empezar': 'Not started', 'En curso': 'In progress', 'en curso': 'in progress', 'sin empezar': 'not started', 'Claro': 'Clear', 'Teoría': 'Theory',
  'Unidades': 'Units', 'Nueva unidad': 'New unit', 'Añadir unidad': 'Add unit', 'Nombre de la unidad': 'Unit name', 'Bloque 1': 'Block 1', 'Volver a Estudios': 'Back to Studies', 'Volver a la asignatura': 'Back to the subject', 'Mostrar unidades': 'Show units', 'Ocultar unidades': 'Hide units',
  'Prácticas': 'Practicals', 'Práctica': 'Practical', 'Añadir práctica': 'Add practical', 'Nombre de la práctica': 'Practical name', 'Práctica 1': 'Practical 1', '¿Quitar esta práctica?': 'Remove this practical?', '¿Quitar este tema y sus apuntes?': 'Remove this topic and its notes?',
  'Recursos': 'Resources', 'Añadir enlace': 'Add link', 'Pega un enlace': 'Paste a link', 'Abrir en otra pestaña': 'Open in a new tab', 'Temario y apuntes': 'Syllabus and notes', 'PDF grande': 'Large PDF', 'PDF y apuntes': 'PDF and notes', 'Apuntes grandes': 'Large notes', 'Tamaño de las ventanas': 'Panel sizes',
  'Subir archivo': 'Upload file', 'Cambiar archivo': 'Change file', 'Quitar archivo': 'Remove file', 'Sin archivo': 'No file', 'Subir el temario (PDF)': 'Upload the syllabus (PDF)', 'Subir el enunciado (PDF)': 'Upload the brief (PDF)',
  'Añade un tema con + para empezar a tomar apuntes.': 'Add a topic with + to start taking notes.', 'Añade una práctica con +: el enunciado en PDF a un lado y tu solución al otro.': 'Add a practical with +: the PDF brief on one side and your solution on the other.',
  'Entregas': 'Deadlines', 'Añadir entrega': 'Add deadline', 'Qué hay que entregar': "What's due", 'Tipo de entrega': 'Type', 'Examen': 'Exam', 'Proyecto final': 'Final project', 'Marcar como entregada': 'Mark as submitted', 'Marcar como hecha': 'Mark as done', 'Aún no has entregado nada': "You haven't submitted anything yet", 'Entregas hechas': 'Submitted', 'Nada pendiente.': 'Nothing pending.', 'Nada pendiente': 'Nothing pending',
  'Horario': 'Timetable', 'Añadir franja': 'Add slot', 'Pulsa + para añadir la primera franja.': 'Press + to add the first slot.', 'Añade tus asignaturas para construir el horario.': 'Add your subjects to build the timetable.', 'Elegir asignatura': 'Choose subject', 'Pincel': 'Brush', 'Pincel: elige y pinta casillas': 'Brush: pick and paint cells',
  'Recreo': 'Break', 'Nombre del descanso': 'Break name', 'Sudoku': 'Sudoku', 'Spelling Bee': 'Spelling Bee', 'Mini crucigrama': 'Mini crossword', 'Ranking de juegos de la semana': "This week's game ranking", 'Juega a los juegos del Journal (Palabra del día, Sudoku, Spelling Bee, Mini crucigrama) y compite con tus amigos.': 'Play the Journal games (Word of the day, Sudoku, Spelling Bee, Mini crossword) and compete with your friends.',
  'Mezclar': 'Shuffle', 'Horizontales': 'Across', 'Comprobar': 'Check', 'Revelar palabra': 'Reveal word', 'Verticales': 'Down', 'Pista anterior': 'Previous clue', 'Pista siguiente': 'Next clue', 'Jugar →': 'Play →', 'Seguir →': 'Continue →', 'Ver →': 'View →', 'Jugar': 'Play', 'Seguir': 'Continue', 'Sin empezar': 'Not started', 'A medias': 'In progress', '{0} palabras': '{0} words', 'Escribe…': 'Type…', 'Muy corta': 'Too short', 'Falta la letra del centro': 'Missing the centre letter', 'Ya la tienes': 'Already found', 'No está en la lista': 'Not in the list', '¡Pangrama!': 'Pangram!', '{0} puntos · {1} palabras': '{0} points · {1} words',
  'Empezando': 'Beginner', 'Muy bien': 'Great', 'Genial': 'Amazing', 'Experta': 'Expert', 'Reina del panal': 'Queen Bee', 'Toca una casilla para empezar': 'Tap a square to start', '{0} fallos': '{0} mistakes', 'No se ha podido preparar el juego de hoy. Inténtalo en un rato.': "Today's game couldn't be prepared. Try again in a bit.", 'Conectar Google Calendar': 'Connect Google Calendar', 'Reconectar Google Calendar': 'Reconnect Google Calendar', 'Google Calendar': 'Google Calendar', 'Desconectar': 'Disconnect', 'Vuelve a conectar Google Calendar': 'Reconnect Google Calendar', 'Google no ha dado permiso': "Google didn't grant access", 'Se ha cerrado la ventana de Google': 'The Google window was closed', 'Google Calendar no responde': "Google Calendar isn't responding", 'Goma': 'Eraser', 'Goma: toca casillas para vaciarlas': 'Eraser: tap cells to clear them', '+ Franja': '+ Slot', 'Vaciar horario': 'Clear timetable', '¿Vaciar todo el horario?': 'Clear the whole timetable?', 'Añade una franja con «+ Franja».': 'Add a slot with "+ Slot".', 'Eliminar franja': 'Delete slot', 'Duración en minutos': 'Duration in minutes', '5 minutos más': '5 more minutes', '5 minutos menos': '5 fewer minutes', 'AÑADE TU HORARIO · AÑADE TU HORARIO ·': 'ADD YOUR TIMETABLE · ADD YOUR TIMETABLE ·', 'Añade tu horario': 'Add your timetable', 'Nombre de la franja': 'Slot name', 'Tipo de franja': 'Slot type', 'Hora de inicio': 'Start time', 'Hora de fin': 'End time', 'Hora no válida': 'Invalid time', 'Quitar fila': 'Remove row', 'Mover fila (arrastra o usa las flechas)': 'Move row (drag or use the arrows)',
  'Crear etiqueta': 'Create label', 'Nueva etiqueta': 'New label', 'Nombre de la etiqueta': 'Label name', 'Convalidada': 'Exempt', 'Terminada': 'Finished', 'Estado': 'Status', 'Cambiar estado': 'Change status', 'Cambiar nombre': 'Rename', 'Planificador de estudios': 'Study planner',

  'Entreno': 'Workout', 'Escribir': 'Writing', 'Estirar': 'Stretching', 'Bicicleta': 'Cycling', 'Running': 'Running', 'Reiniciar': 'Reset', 'Foco {0}': 'Focus {0}', 'Pausa {0}': 'Break {0}', 'foco': 'focus', 'pausa': 'break',
  'sesiones': 'sessions', '{0} sesiones hoy': '{0} sessions today', '{0} sesión hoy': '{0} session today', 'raciones para lo que queda de semana': 'portions for the rest of the week', 'vasos': 'glasses', 'de': 'of', 'toca para pausar': 'tap to pause',
  'Falta VITE_GOOGLE_CLIENT_ID (mira .env.example)': 'VITE_GOOGLE_CLIENT_ID is missing (see .env.example)',
  'libros': 'books', 'veces': 'times', 'palabras': 'words', 'Ahorrar': 'Save', 'Aprender palabras': 'Learn words', '{0} de': '{0} of', 'de {0}': 'of {0}', '·': '·',
  'Elige tu nombre de usuario en Perfil para añadir amigos': 'Pick your username in Profile to add friends', 'Añadir amigos': 'Add friends', 'Avatar': 'Avatar',
  'Amigos': 'Friends', 'Feed': 'Feed', 'Retos': 'Challenges', 'Edificio': 'Building', 'Ajustes': 'Settings', 'Ver todo': 'See all', 'Tus amigos hoy': 'Your friends today', 'Comentar': 'Comment', '1 comentario': '1 comment', '{0} comentarios': '{0} comments',
  'Dejar de compartir': 'Stop sharing', 'privado': 'private', 'para ti': 'for you', 'ahora': 'now', 'hace {0} min': '{0} min ago', 'hace {0} h': '{0} h ago', 'Escribe un comentario…': 'Write a comment…', 'Gracias': 'Thanks',
  'Guardar en mis platos': 'Save to my dishes', 'Guardada en tus platos': 'Saved to your dishes', 'El feed está tranquilo': 'The feed is quiet', 'Compartir': 'Share', 'En el feed': 'In the feed', 'Lo ven todos tus amigos y pueden reaccionar': 'All your friends see it and can react',
  'O solo a': 'Or only to', 'Añade un mensaje (opcional)': 'Add a message (optional)', 'Compartir en el feed': 'Share in the feed', 'Elige a quién': 'Choose who', 'Compartido en el feed': 'Shared in the feed', 'Añade amigos en Amigos para compartir con ellos': 'Add friends in Friends to share with them',
  'Retar': 'Challenge', 'Estudiar juntos': 'Study together', 'Regalar': 'Gift', 'Su edificio': 'Their building', 'Aún sin bloques': 'No blocks yet', '{0} días cerrados': '{0} days closed', 'Cerrar el día': 'Close the day', 'Secretos': 'Secrets',
  'Sin retos': 'No challenges', '+ Nuevo reto': '+ New challenge', 'Nuevo reto': 'New challenge', 'Aceptar el reto': 'Accept the challenge', 'Salir': 'Leave', 'Se cuenta solo con lo que apuntas': 'It counts automatically from what you log', 'Con quién': 'With whom', '¿Cuántos esta semana?': 'How many this week?', '{0} esta semana': '{0} this week',
  'Entrenos': 'Workouts', 'Días con el agua cumplida': 'Days hitting your water goal', 'Hábitos cumplidos': 'Habits done', 'Sesiones de foco': 'Focus sessions', 'Tú': 'You',
  'Brote': 'Sprout', 'Aureola': 'Halo', 'Estrella': 'Star', 'Gorro de fiesta': 'Party hat', 'Comparte algo por primera vez': 'Share something for the first time', 'Cierra 3 días': 'Close 3 days', 'Cierra 10 días': 'Close 10 days', 'Llega con tu cumpleaños': 'Comes with your birthday',
  'Compartir automáticamente': 'Share automatically', 'Cómo me siento hoy': 'How I feel today', 'Mi edificio': 'My building', 'Mi cumpleaños': 'My birthday', 'Lo que has compartido': "What you've shared", 'Nada todavía': 'Nothing yet',
  'Terminar': 'Finish', 'Unirme': 'Join', 'Empezar 25 min': 'Start 25 min', 'cuando quieras': 'whenever you like', 'Tus amigos ven que estás estudiando y cuánto te queda.': "Your friends see you're studying and how long is left.", '¡Regalado!': 'Gifted!',
  'Añade amigos en Ajustes y aparecerán aquí': "Add friends in Settings and they'll show up here", 'Bien': 'Good', 'Regular': 'Okay', 'Mal': 'Bad',
  // ---- Calendario: tipos y filtros
  'Tareas, entregas y eventos': 'Tasks, deadlines and events', 'Filtros': 'Filters',
}

// Frases con una parte variable (nombres, días…): [patrón, traducción]. Se prueban si no hay coincidencia exacta.
const MEALS = { Desayuno: 'Breakfast', 'Media mañana': 'Mid-morning', Comida: 'Lunch', Merienda: 'Snack', Cena: 'Dinner' }
export const RULES = [
  [/^¡Resuelto en (.+)!$/, (m, t) => `Solved in ${t}!`],
  [/^Área de (.+)$/, (m, x, tr) => tr(x)],
  [/^Hoy: (.+)$/, (m, x, tr) => `Today: ${tr(x)}`],
  [/^Compartir «(.+)»$/, (m, x) => `Share "${x}"`],
  [/^Regalar a @(\S+)$/, (m, u) => `Gift to @${u}`],
  [/^Enviar a (.+)$/, (m, x) => `Send to ${x.replace(' amigos', ' friends')}`],
  [/^Enviado a (.+)$/, (m, x) => `Sent to ${x}`],
  [/^Hola, (.+)$/, (m, n) => `Hi, ${n}`],
  [/^(Desayuno|Media mañana|Comida|Merienda|Cena) del (.+)$/, (m, meal, day) => `${MEALS[meal]} on ${day}`],
  [/^Deporte del (.+)$/, (m, day) => `Sport for ${day}`],
  [/^(.+) \((\d+)\)$/, (m, base, n, tr) => `${tr(base)} (${n})`],
  [/^Quitar (.+)$/, (m, x) => `Remove ${x}`],
  [/^Borrar (.+)$/, (m, x) => `Delete ${x}`],
  [/^Abrir (.+)$/, (m, x) => `Open ${x}`],
  [/^Marcar «(.+)»$/, (m, x) => `Mark "${x}"`],
  [/^Cumpleaños de (.+)$/, (m, x) => `${x}'s birthday`],
  [/^De @(\S+) · Escrita el (.+)$/, (m, u, d) => `From @${u} · Written on ${d}`],
  [/^Escrita el (.+)$/, (m, d) => `Written on ${d}`],
  [/^Se abre el (.+)$/, (m, d) => `Opens on ${d}`],
  [/^Enviada a @(\S+)\. La podrá abrir el (.+)\.$/, (m, u, d) => `Sent to @${u}. They can open it on ${d}.`],
  [/^Escribe a @(\S+)\. No podrá leerla hasta la fecha que elijas\.$/, (m, u) => `Write to @${u}. They can't read it until the date you choose.`],
  [/^Cápsula cerrada, faltan (\d+) días$/, (m, n) => `Sealed capsule, ${n} days left`],
  [/^@(\S+) te ha compartido (.+)$/, (m, u, x) => `@${u} shared ${x} with you`],
  [/^Próximo: (.+)$/, (m, x) => `Next: ${x}`],
  [/^Tamaño de (.+)$/, (m, x) => `Size of ${x}`],
]

export default EN
