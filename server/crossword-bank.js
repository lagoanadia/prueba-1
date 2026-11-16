// Banco de palabras del mini crucigrama: cultura general (capitales, ciencia, arte, historia, mitología…).
// Cada día se coge un trozo distinto del banco (ver pickEntries), así no se repiten las palabras de un día para otro.
export const CROSSWORD_BANK = {
  es: [
    ['OSLO', 'Capital de Noruega'], ['ROMA', 'Ciudad fundada, según la leyenda, por Rómulo'], ['LIMA', 'Capital de Perú'], ['QUITO', 'Capital de Ecuador'],
    ['PARIS', 'Capital a orillas del Sena'], ['BERNA', 'Capital de Suiza'], ['RIGA', 'Capital de Letonia'], ['SEUL', 'Capital de Corea del Sur'],
    ['CAIRO', 'Ciudad junto a las pirámides de Guiza'], ['DOHA', 'Capital de Catar'], ['ACRA', 'Capital de Ghana'], ['NILO', 'Río más largo de África'],
    ['EBRO', 'Río que pasa por Zaragoza'], ['TAJO', 'Río más largo de la península ibérica'], ['SENA', 'Río que cruza París'], ['VOLGA', 'Río más largo de Europa'],
    ['URAL', 'Montes que separan Europa de Asia'], ['ANDES', 'Cordillera más larga del mundo'], ['ALPES', 'Cordillera del Mont Blanc'], ['ETNA', 'Volcán activo de Sicilia'],
    ['OCA', 'Juego de mesa de tablero en espiral'], ['ZINC', 'Metal de símbolo Zn'], ['NEON', 'Gas noble de los letreros luminosos'], ['ARGON', 'Gas noble de símbolo Ar'],
    ['RADIO', 'Elemento que descubrió Marie Curie'], ['UREA', 'Compuesto que se elimina en la orina'], ['ATOMO', 'Partícula que da nombre a la era nuclear'], ['OHMIO', 'Unidad de resistencia eléctrica'],
    ['JULIO', 'Unidad de energía del Sistema Internacional'], ['VATIO', 'Unidad de potencia'], ['LUX', 'Unidad de iluminancia'], ['CERO', 'Número que se inventó en la India'],
    ['SENO', 'Función trigonométrica: cateto opuesto entre hipotenusa'], ['ECO', 'Sonido que vuelve al rebotar'], ['IRIS', 'Parte coloreada del ojo'], ['TIBIA', 'Hueso de la pierna, junto al peroné'],
    ['ATLAS', 'Primera vértebra del cuello'], ['AORTA', 'Arteria principal del cuerpo'], ['UVULA', 'La «campanilla» de la garganta'], ['POLEN', 'Polvo que transportan las abejas'],
    ['SAVIA', 'Líquido que circula por las plantas'], ['OLMO', 'Árbol de las alamedas que diezmó la grafiosis'], ['TEJO', 'Árbol venenoso, sagrado para los celtas'], ['ACEBO', 'Arbusto de hojas con pinchos y bayas rojas'],
    ['LOTO', 'Flor sagrada en el budismo'], ['ORCA', 'Cetáceo conocido como ballena asesina'], ['ALCE', 'El mayor de los ciervos'], ['LLAMA', 'Camélido de los Andes'],
    ['PUMA', 'Felino americano o león de montaña'], ['KOALA', 'Marsupial que solo come eucalipto'], ['EMU', 'Ave corredora de Australia'], ['ÑANDU', 'Ave corredora sudamericana'],
    ['IBIS', 'Ave sagrada del antiguo Egipto'], ['ZEUS', 'Dios supremo del Olimpo'], ['HERA', 'Esposa de Zeus'], ['ARES', 'Dios griego de la guerra'],
    ['EROS', 'Dios griego del amor'], ['THOR', 'Dios nórdico del trueno'], ['ODIN', 'Padre de los dioses nórdicos'], ['ISIS', 'Diosa egipcia, esposa de Osiris'],
    ['TROYA', 'Ciudad del famoso caballo de madera'], ['ITACA', 'Isla a la que vuelve Ulises'], ['ODA', 'Poema lírico de tono elevado'], ['LIRA', 'Instrumento de Orfeo'],
    ['OBOE', 'Instrumento de viento de doble lengüeta'], ['TUBA', 'El metal más grave de la orquesta'], ['ARPA', 'Instrumento de cuerdas que se pulsan con los dedos'], ['OPERA', 'Género de Verdi y Puccini'],
    ['AIDA', 'Ópera de Verdi ambientada en Egipto'], ['TANGO', 'Baile nacido en el Río de la Plata'], ['LORCA', 'Autor de «Bodas de sangre»'], ['DALI', 'Pintor de los relojes blandos'],
    ['MIRO', 'Pintor surrealista barcelonés de la Fundació'], ['GOYA', 'Pintor de «Los fusilamientos del 3 de mayo»'], ['MONET', 'Padre del impresionismo'], ['MUNCH', 'Pintor de «El grito»'],
    ['OLEO', 'Pintura hecha con aceites'], ['RIMA', 'Coincidencia de sonidos al final de los versos'], ['CID', 'El Campeador'], ['CESAR', 'Dictador asesinado en los idus de marzo'],
    ['NERON', 'Emperador acusado del incendio de Roma'], ['INCA', 'Imperio de Machu Picchu'], ['MAYA', 'Civilización de Chichén Itzá'], ['EDEN', 'Paraíso terrenal'],
    ['ARCA', 'Embarcación de Noé'], ['ATILA', 'Rey de los hunos'], ['TUDOR', 'Dinastía de Enrique VIII'], ['EURO', 'Moneda de una veintena de países europeos'],
    ['YEN', 'Moneda de Japón'], ['RUPIA', 'Moneda de la India'], ['PESO', 'Moneda de México'], ['LIBRA', 'Moneda del Reino Unido'],
    ['ONU', 'Organización con sede en Nueva York (siglas)'], ['OTAN', 'Alianza militar del Atlántico Norte (siglas)'], ['UEFA', 'Organismo del fútbol europeo'], ['GOLF', 'Deporte del hoyo en uno'],
    ['POLO', 'Deporte a caballo con mazo'], ['REMO', 'Deporte de Oxford contra Cambridge en el Támesis'], ['JUDO', 'Arte marcial cuyo nombre significa «camino suave»'], ['SUMO', 'Lucha tradicional japonesa'],
    ['DAKAR', 'Rally que nació en África'], ['TOUR', 'La gran vuelta ciclista a Francia'], ['SET', 'Parte de un partido de tenis'], ['ALFIL', 'Pieza de ajedrez que va en diagonal'],
    ['TORRE', 'Pieza de ajedrez que interviene en el enroque'], ['JAQUE', 'Amenaza al rey en ajedrez'], ['MATE', 'Fin de la partida de ajedrez; también infusión argentina'], ['HAIKU', 'Poema japonés de tres versos'],
    ['TOFU', 'Cuajada de soja'], ['MISO', 'Pasta japonesa de soja fermentada'], ['CURRY', 'Mezcla de especias de la India'], ['ANIS', 'Semilla con sabor parecido al regaliz'],
    ['ORUJO', 'Aguardiente gallego'], ['CAVA', 'Espumoso catalán'], ['SIDRA', 'Bebida asturiana de manzana'], ['ROBOT', 'Palabra que inventó Karel Čapek'],
    ['LASER', 'Luz amplificada por emisión estimulada'], ['RADAR', 'Detecta objetos con ondas de radio'], ['SONAR', 'Detecta objetos bajo el agua con sonido'], ['HTML', 'Lenguaje de las páginas web (siglas)'],
    ['JAVA', 'Lenguaje de programación con una taza de café de logo'], ['LINUX', 'Sistema operativo del pingüino'], ['RAM', 'Memoria volátil del ordenador (siglas)'], ['BIT', 'Unidad mínima de información'],
    ['PIXEL', 'Punto mínimo de una imagen digital'], ['WIFI', 'Conexión inalámbrica a internet'], ['AMEN', 'Palabra que cierra las oraciones'], ['ALFA', 'Primera letra griega'],
    ['BETA', 'Segunda letra griega; versión de prueba'], ['DELTA', 'Letra griega y desembocadura en abanico'], ['OMEGA', 'Última letra griega'], ['SIGMA', 'Letra griega que indica suma'],
    ['IOTA', 'La letra griega más pequeña'], ['RUNA', 'Letra del antiguo alfabeto nórdico'], ['SAGA', 'Relato de héroes nórdicos'], ['ELFO', 'Ser mágico de Tolkien'],
    ['ORCO', 'Criatura malvada de Tolkien'], ['OASIS', 'Agua y palmeras en el desierto'], ['DUNA', 'Montaña de arena'], ['GOBI', 'Desierto de Mongolia'],
    ['ISTMO', 'Franja de tierra que une dos zonas, como Panamá'], ['CABO', 'Punta de tierra que entra en el mar'], ['GOLFO', 'Gran entrante de mar, como el de México'], ['RIA', 'Valle fluvial invadido por el mar, típico de Galicia'],
    ['LAVA', 'Roca fundida que expulsa un volcán'], ['MAGMA', 'Roca fundida bajo la superficie'], ['SISMO', 'Terremoto'], ['VENUS', 'El planeta más caliente del sistema solar'],
    ['MARTE', 'El planeta rojo'], ['URANO', 'Planeta que gira tumbado'], ['TITAN', 'La mayor luna de Saturno'], ['NOVA', 'Estrella que aumenta de brillo de repente'],
    ['ORION', 'Constelación del cazador'], ['VEGA', 'Estrella más brillante de la Lira'], ['NASA', 'Agencia espacial de EE. UU.'], ['APOLO', 'Programa que llevó al hombre a la Luna'],
    ['OSCAR', 'Premio de Hollywood'], ['EMMY', 'Premio de la televisión'], ['NOBEL', 'Premio que creó el inventor de la dinamita'], ['ETICA', 'Rama de la filosofía sobre el bien y el mal'],
    ['MITO', 'Relato de dioses y héroes'], ['TOTEM', 'Poste tallado de los pueblos indígenas'], ['ICONO', 'Imagen religiosa bizantina'], ['ATRIO', 'Patio de entrada de un templo'],
    ['NAVE', 'Espacio principal de una iglesia'], ['OJIVA', 'Arco apuntado del gótico'], ['LENTE', 'Cristal que desvía la luz'], ['IMAN', 'Atrae el hierro'],
    ['LITIO', 'Metal de las baterías'], ['COBRE', 'Metal rojizo de los cables'], ['PLOMO', 'Metal pesado de símbolo Pb'], ['PLATA', 'Metal de símbolo Ag'],
    ['CLORO', 'Elemento que desinfecta las piscinas'], ['YODO', 'Elemento de símbolo I'], ['OZONO', 'Capa que nos protege de los rayos UV'], ['HELIO', 'Gas que hace flotar los globos'],
    ['SAL', 'Cloruro de sodio'], ['ACIDO', 'Lo que tiene un pH menor que 7'], ['NIOBE', 'Madre que lloró a sus hijos hasta volverse piedra'], ['EDIPO', 'Rey de Tebas que resolvió el enigma de la Esfinge'],
    ['ICARO', 'Voló demasiado cerca del sol'], ['ATENA', 'Diosa griega de la sabiduría'], ['HADES', 'Dios griego del inframundo'],
  ],
  en: [
    ['OSLO', 'Capital of Norway'], ['ROME', 'The Eternal City'], ['LIMA', 'Capital of Peru'], ['PARIS', 'City of the Louvre'],
    ['BERN', 'Capital of Switzerland'], ['RIGA', 'Capital of Latvia'], ['SEOUL', 'Capital of South Korea'], ['CAIRO', 'City near the Giza pyramids'],
    ['DOHA', 'Capital of Qatar'], ['NILE', 'Longest river in Africa'], ['SEINE', 'River through Paris'], ['VOLGA', 'Longest river in Europe'],
    ['URALS', 'Mountains between Europe and Asia'], ['ANDES', 'Longest mountain range on Earth'], ['ALPS', 'Range of Mont Blanc'], ['ETNA', 'Active volcano on Sicily'],
    ['GOBI', 'Desert of Mongolia'], ['ZINC', 'Element with symbol Zn'], ['NEON', 'Gas in glowing signs'], ['ARGON', 'Noble gas Ar'],
    ['RADON', 'Radioactive noble gas'], ['IRON', 'Element with symbol Fe'], ['TIN', 'Element with symbol Sn'], ['LEAD', 'Element with symbol Pb'],
    ['GOLD', 'Element with symbol Au'], ['OZONE', 'Layer that blocks UV rays'], ['ATOM', 'Smallest unit of an element'], ['OHM', 'Unit of electrical resistance'],
    ['JOULE', 'SI unit of energy'], ['WATT', 'Unit of power'], ['VOLT', 'Unit of electric potential'], ['SINE', 'Opposite over hypotenuse'],
    ['ZERO', 'Number first used as a digit in India'], ['ECHO', 'Sound that bounces back'], ['IRIS', 'Coloured part of the eye'], ['TIBIA', 'The shinbone'],
    ['ATLAS', 'Top vertebra of the neck'], ['AORTA', 'The main artery'], ['UVULA', 'It hangs at the back of the throat'], ['SAP', 'Fluid that flows in plants'],
    ['ELM', 'Tree hit hard by Dutch disease'], ['YEW', 'Poisonous evergreen of churchyards'], ['HOLLY', 'Spiky plant with red berries'], ['LOTUS', 'Sacred flower in Buddhism'],
    ['ORCA', 'The killer whale'], ['MOOSE', 'Largest member of the deer family'], ['LLAMA', 'Andean camelid'], ['PUMA', 'American big cat, or mountain lion'],
    ['KOALA', 'Marsupial that eats eucalyptus'], ['EMU', 'Flightless bird of Australia'], ['IBIS', 'Sacred bird of ancient Egypt'], ['ZEUS', 'King of the Olympian gods'],
    ['HERA', 'Wife of Zeus'], ['ARES', 'Greek god of war'], ['EROS', 'Greek god of love'], ['THOR', 'Norse god of thunder'],
    ['ODIN', 'Father of the Norse gods'], ['ISIS', 'Egyptian goddess, wife of Osiris'], ['TROY', 'City of the wooden horse'], ['ODE', 'Lyric poem of praise'],
    ['LYRE', 'Instrument of Orpheus'], ['OBOE', 'Double-reed woodwind'], ['TUBA', 'Lowest brass instrument'], ['HARP', 'Plucked instrument of many strings'],
    ['OPERA', 'Genre of Verdi and Puccini'], ['AIDA', 'Verdi opera set in Egypt'], ['TANGO', 'Dance born in Buenos Aires'], ['DALI', 'Painter of melting clocks'],
    ['MIRO', 'Catalan surrealist painter'], ['GOYA', 'Painter of "The Third of May 1808"'], ['MONET', 'Father of Impressionism'], ['MUNCH', 'Painter of "The Scream"'],
    ['RHYME', 'Matching sounds at the ends of lines'], ['EPIC', 'Long heroic poem'], ['NERO', 'Emperor blamed for the fire of Rome'], ['INCA', 'Empire of Machu Picchu'],
    ['MAYA', 'Civilisation of Chichen Itza'], ['AZTEC', 'Empire of Tenochtitlan'], ['EDEN', 'Garden of Adam and Eve'], ['ARK', "Noah's vessel"],
    ['TUDOR', 'Dynasty of Henry VIII'], ['EURO', 'Currency of about twenty EU countries'], ['YEN', 'Currency of Japan'], ['RUPEE', 'Currency of India'],
    ['PESO', 'Currency of Mexico'], ['POUND', 'Currency of the UK'], ['NATO', 'North Atlantic military alliance'], ['UEFA', 'European football body'],
    ['GOLF', 'Sport of the hole in one'], ['POLO', 'Sport played on horseback with mallets'], ['JUDO', 'Martial art meaning "gentle way"'], ['SUMO', 'Traditional Japanese wrestling'],
    ['SET', 'Part of a tennis match'], ['ACE', 'Unreturnable serve'], ['ROOK', 'Chess piece used in castling'], ['QUEEN', 'Most powerful chess piece'],
    ['MATE', 'End of a chess game'], ['CHECK', 'Threat to the king'], ['HAIKU', 'Three-line Japanese poem'], ['TOFU', 'Bean curd'],
    ['MISO', 'Fermented soybean paste'], ['CURRY', 'Spiced dish of South Asia'], ['ANISE', 'Seed that tastes like liquorice'], ['CIDER', 'Drink made from apples'],
    ['ROBOT', 'Word coined by Karel Capek'], ['LASER', 'Light amplified by stimulated emission'], ['RADAR', 'Detects objects with radio waves'], ['SONAR', 'Detects objects underwater with sound'],
    ['HTML', 'Language of web pages'], ['JAVA', 'Language with a coffee cup logo'], ['LINUX', 'Operating system with a penguin'], ['RAM', 'Volatile computer memory'],
    ['BIT', 'Smallest unit of information'], ['PIXEL', 'Smallest dot of a digital image'], ['AMEN', 'Word that ends a prayer'], ['ALPHA', 'First Greek letter'],
    ['BETA', 'Second Greek letter; test version'], ['DELTA', 'Greek letter and fan-shaped river mouth'], ['OMEGA', 'Last Greek letter'], ['SIGMA', 'Greek letter for a sum'],
    ['IOTA', 'Tiniest Greek letter'], ['RUNE', 'Letter of the old Norse alphabet'], ['SAGA', 'Norse tale of heroes'], ['ELF', 'Magical being in Tolkien'],
    ['ORC', 'Evil creature in Tolkien'], ['OASIS', 'Water and palms in the desert'], ['DUNE', 'Hill of sand'], ['ATOLL', 'Ring-shaped coral island'],
    ['FJORD', 'Narrow sea inlet of Norway'], ['CAPE', 'Point of land jutting into the sea'], ['GULF', "Large inlet of the sea, like Mexico's"], ['LAVA', 'Molten rock from a volcano'],
    ['MAGMA', 'Molten rock underground'], ['VENUS', 'Hottest planet in the solar system'], ['MARS', 'The red planet'], ['TITAN', "Saturn's largest moon"],
    ['NOVA', 'Star that suddenly brightens'], ['ORION', 'Constellation of the hunter'], ['VEGA', 'Brightest star in Lyra'], ['NASA', 'US space agency'],
    ['OSCAR', 'Hollywood award'], ['EMMY', 'Television award'], ['NOBEL', 'Prize founded by the inventor of dynamite'], ['LOGIC', 'Study of valid reasoning'],
    ['MYTH', 'Story of gods and heroes'], ['TOTEM', 'Carved pole of Indigenous peoples'], ['ICON', 'Byzantine religious image'], ['NAVE', 'Main body of a church'],
    ['ARCH', 'Curved structure over an opening'], ['LENS', 'Glass that bends light'], ['PRISM', 'Splits white light into colours'], ['SALT', 'Sodium chloride'],
    ['ACID', 'Has a pH below 7'], ['OXIDE', 'Compound with oxygen, like rust'], ['HADES', 'Greek god of the underworld'], ['IONIC', 'Greek column with scrolls'],
  ],
}

// Orden fijo pero barajado del banco (siempre el mismo) y cada día un trozo distinto: los días seguidos no comparten palabras
const shuffled = {}
const order = (lang) => {
  if (shuffled[lang]) return shuffled[lang]
  const list = [...CROSSWORD_BANK[lang]]
  let s = 12345
  for (let i = list.length - 1; i > 0; i--) { s = (s * 1103515245 + 12345) % 2147483648; const j = s % (i + 1); [list[i], list[j]] = [list[j], list[i]] }
  return (shuffled[lang] = list)
}
export function pickEntries(lang, date, n = 40) {
  const list = order(lang === 'en' ? 'en' : 'es')
  const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 864e5)
  const start = (day * n) % list.length
  return Array.from({ length: n }, (_, i) => list[(start + i) % list.length]).map(([answer, clue]) => ({ answer, clue }))
}
