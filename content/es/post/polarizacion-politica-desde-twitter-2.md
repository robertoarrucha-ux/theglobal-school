---
title: "Polarización política desde twitter"
seoTitle: "Polarización política desde twitter - The New Global School"
description: "La propuesta de pensar los follows y follows back en Twitter como indicadores no convecionales de la polarización dentro de un sistema político, o, acaso, indicadores que ayuden a revelar las preferencias de sus actores, , me pareció muy (¡muy!) interesante. Sin embargo, cuando quise aventurarme a hacer lo mismo para Argentina, me encontré con un problema central: la sección de Datos Abiertos de la Cámara de Diputados no ofrece un listado con las cuentas de Twitter de nuestros diputados y diputadas."
slug: "polarizacion-politica-desde-twitter-2"
lang: "es"
type: "post"
date: "2020-03-04 01:56:31"
canonical: "https://es.theglobal.school/polarizacion-politica-desde-twitter-2/"
ogTitle: "Polarización política desde twitter"
ogImage: "/media/2024/02/The-New-Global-School.webp"
hero: "/media/2019/11/facebook-icon.webp"
targetKeyword: "Polarización política desde twitter"
sourceUrl: "https://es.theglobal.school/polarizacion-politica-desde-twitter-2/"
images: ["/media/2019/11/facebook-icon.webp", "/media/2019/11/instagram-icon.webp", "/media/2019/11/linkedin-icon.webp", "/media/2019/11/twitter-icon.webp", "/media/2020/02/1-2-997x1024.webp", "/media/2020/02/2-1-1024x986.webp", "/media/2020/02/3-1-1008x1024.webp", "/media/2020/02/educacion-global-Viena.webp", "/media/2020/02/4-1-1024x1015.webp", "/media/2020/02/1-2-997x1024.webp", "/media/2020/02/2-1-1024x986.webp", "/media/2020/02/3-1-1008x1024.webp", "/media/2020/02/4-1-1024x1015.webp", "/media/2020/02/5-1-1024x254.webp", "/media/2020/02/Lasa.webp"]
---
---

***Hola querido lector!***

*Si llegaste a la página de **The Global School for Social Leaders**, déjanos presentarnos, somos una multi-premiada ONG con sede en **Viena, Austria, y Berlín, Alemania,** especializada en educación holística y disruptiva para líderes e innovadores sociales. El contenido publicado aquí es verificado y seleccionado cuidadosamente para inspirar tu pensamiénto, entendimiento y proactividad.*

*Puedes Ver nuestros programas **[AQUÍ](https://theglobal.school/programs/) , o seguirnos en:***

[![](/media/2019/11/facebook-icon.webp)](https://www.facebook.com/Globschool) [![](/media/2019/11/instagram-icon.webp)](https://www.instagram.com/Globschool)[![](/media/2019/11/linkedin-icon.webp)](https://www.linkedin.com/company/theglobalschool/)[![](/media/2019/11/twitter-icon.webp)](http://www.twitter.com/globschool)

***Disfruta la lectura y tu día! 🙂***

---

# **Sígueme que te sigo**

En mayo de 2019 leí un artículo sobre las relaciones de los diputados españoles en Twitter. La nota, analizando follows y follows back en la red social del pajarito, mostraba cómo los representantes de ese país prefieren seguir a colegas de su mismo partido. La conclusión era que el Congreso español está fuertemente polarizado y cerrado sobre bloques partidarios.

La propuesta de pensar los *follows* y *follows back* en Twitter como **indicadores no convecionales** de la polarización dentro de un sistema político, o, acaso, indicadores que ayuden a revelar las preferencias de sus actores, , me pareció muy (¡muy!) interesante. Sin embargo, cuando quise aventurarme a hacer lo mismo para Argentina, me encontré con un problema central: la sección de [Datos Abiertos de la Cámara de Diputados](https://datos.hcdn.gob.ar/) no ofrece un listado con las cuentas de Twitter de nuestros diputados y diputadas.

Quizás estás pensando: “*¿Y por qué no hiciste la lista vos?*”. Con más tiempo, paciencia y asistentes, ¡sin problemas! Pero listar las cuentas de 257 diputados, y conformar una *edge list* con 65,729 interacciones, excede *by far* la ambición, ¡y el presupuesto! de un blog como el mío.

En su lugar, seleccioné una muestra intencional no probabilística compuesta por cuarenta cuentas de Twitter: veinte de dirigentes políticos de **Juntos por el Cambio**, y veinte de la alianza **Frente de Todos**. Las cuentas son de alta intensidad en términos de *followers*, periodicidad de twitteo, *favs* y RTs. Y, como verás, incluyo tanto a funcionarios/as del poder ejecutivo como a representantes del poder legislativo.

Una vez que construí la base de datos con las cuentas de Twitter, ingresé a [*Does Follow*](https://doesfollow.com/) y conformé una *edge list* sobre 1.560 posibles interacciones. A renglón seguido, armé una *node list* contemplando cinco variables de cada usuario, *followers*, *follows*, sexo, año de creación de la cuenta y afiliación partidaria, . Finalmente, con ambas listas, creé dos visualizaciones.

> Nota: Las bases de datos fueron construidas entre los días 7-10 y 13 de febrero de 2020. La próxima vez, cuando quizás ya sepa programar en Python, el proceso será más rápido.

La primera visualización muestra una **red no ponderada** entre los cuarenta dirigentes políticos de la muestra. Si sos un observador agudo habrás notado que, entre Victoria Donda y Gabriela Cerruti, puede trazarse una línea imaginaria de norte a sur. A la izquierda de esa línea, el nodo más grande es Mauricio Macri. A la derecha de esa línea, Cristina Fernández de Kirchner (CFK). **El tamaño de un nodo, efectivamente, habla mucho de poder**.

Adyacencias de red no ponderadas

Si pudieran desactivarse los dos nodos más grandes de la red, Sergio Massa pasaría a dominar el centro. ¿Y eso por qué? Porque @SergioMassa, podría decirse, **camina por la ancha avenida del medio**: recibe *follows* de ambos lado “del muro” y sigue a casi todos… salvo a CFK y a Mauricio Macri.

¡Seguí jugando con la red en búsqueda de conexiones! Cuando termines, te propongo pasar a otra forma de visualizarla: una **matriz de adyacencia ponderada**.

Para conformar la matriz de adyacencia calculé las propiedades de los nodos a partir de **cuatro medidas de centralidad: intermediación, cercanía, valor propio y grado**. Seguidamente, *silencié* la variable de la afiliación partidaria. Por último, le pedí a **R** que me creara **grupos de pertenencia** para nuclear a los nodos sobre la base de *follows* y *follows back*.

En la visualización que sigue podés ver dos grupos de pertenencia claramente diferenciados, salmón y turquesa, , y celdas de color gris. Independientemente del color que tenga, cada pixel coloreado representa un *follow* que una cuenta del eje horizontal ‘*From*’ le hace a una cuenta del eje vertical ‘*To*’. Dicho de otro modo, cada celda de color representa un *follow* que una cuenta del eje vertical ‘*To*’ recibe de una cuenta listada en el eje horizontal ‘*From*’.

![](/media/2020/02/1-2-997x1024.webp)

Matriz de adyacencia ponderada con grupos de pertenencia. Colores aleatorios.

# **¿Curiosidades? Algunas para tener presentes.**

- **Victoria Donda**, cuyo partido político integra el Frente de Todos, quedó en el grupo salmón. El grupo salmón, como ya habrán advertido, nuclea a políticos de Juntos por el Cambio.
- **Miguel Ángel Pichetto** no sigue a nadie, pero integra el grupo salmón porque es más seguido por políticos de Juntos por el Cambio.
- ¿Te acordás de los “cuadraditos” grises? Representan *follows* por fuera de los grupos. La concentración de celdas grises es mayor en el cuadrante inferior derecho (25.5%). Eso significa que el grupo turquesa es… ¿más conciliador? **Sergio Massa**, **Felipe Solá**, **Gabriela Cerruti** y **Elizabeth Gómez Alcorta** son los que construyen puentes desde el grupo turquesa hacia el salmón. Desde el grupo salmón hacia el turquesa tienden lazos, aunque más débiles (12.75%), **Horacio Rodríguez Larreta**, **Diego Santilli** y **Esteban Bullrich**.
- El grupo salmón, en términos comparativos, tiene nodos más grandes que el grupo turquesa.
- La cuenta menos seguida de la muestra es la de **Sabina Frederic**, actual Ministra de Seguridad. La más seguida es la de **Mauricio Macri**.

Vamos a lo importante: ¿hay **grieta**? Siguiendo el método de [*Chequeado*](https://chequeado.com/metodo/), diría que es **discutible**.

La matriz revela la existencia de dos grupos intensos *dentro de sí* pero no *entre sí*, cuestión que se traduce en los coeficientes de *clustering* (*Ci*) de cada grupo: **.885** para el turquesa y **.906** para el salmón. Esto, en principio, es un fuerte indicativo de polarización. Contrario a lo que podría esperarse, sin embargo, el *Ci* global de la red no es tan bajo: **.734**. Esto último se explica por los nodos más *conciliadores* de la muestra, que nos recuerdan un aspecto señalado con insistencia por la Ciencia Política contemporánea. Incluso en contextos de polarización, los espacios políticos no reproducen una voluntad única, sino que son *sistemas* dentro de los cuales intervienen actores con estrategias coincidentes y también contradictorias.

> Nota: El Coeficiente de Clustering (Ci) es un valor métrico entre 0 y 1 que mide el nivel de agrupamiento e interconexión de los nodos de una red. Ci = 0 se corresponde con redes perfectamente desagrupadas y desconectadas. Ci = 1 se corresponde con redes perfectamente agrupadas y conectadas…

# **¡Truco! Gobernadores**

¿La grieta alcanza a los gobernadores? Seguí los mismos pasos que en la sección anterior, aunque esta vez no sobre una muestra, sino sobre la población total, , y los resultados son los siguientes.

Adyacencias de red no ponderadas

La red no ponderada, que incluye a veintitrés gobernadores, al Jefe de Gobierno de la Ciudad de Buenos Aires y al Presidente de la Nación, forma un semicírculo en torno a un gran nodo: **@alferdez**. Si ese nodo se apaga, la red se dispersa completamente. **Los gobernadores prácticamente no se siguen unos a otros**, con la excepción de Juan Manzur (Tucumán) que sigue a casi todos sus pares.

¡Hay que escuchar (y seguir) a todos!

En lo que respecta a la red ponderada, existen tres comunidades de tamaño variable y baja intensidad.

![](/media/2020/02/2-1-1024x986.webp)

Matriz de adyacencia ponderada con grupos de pertenencia. Colores aleatorios.

1. **Grupo salmón**: Alicia Kirchner (Santa Cruz), Arabela Carreras (Río Negro), Axel Kicillof (Buenos Aires), Gustavo Melella (Tierra del Fuego), Jorge Capitanich (Chaco), Juan Schiaretti (Córdoba), Oscar Herrera Ahuad (Misiones), Horacio Rodríguez Larreta (Ciudad de Buenos Aires) y Alberto Fernández (Presidente de la Nación).
2. **Grupo verde**: Gerardo Morales (Jujuy), Gustavo Bordet (Entre Ríos), Gustavo Valdés (Corrientes), Omar Perotti (Santa Fe), Rodolfo Suárez (Mendoza).
3. **Grupo azul**: Gildo Insfrán (Formosa), Gustavo Sáenz (Salta), Mariano Arcioni (Chubut), Omar Gutiérrez (Neuquén), Raúl Jalil (Catamarca), Ricardo Quintela (La Rioja), Sergio Uñac (San Juan), Sergio Ziliotto (La Pampa), Gerardo Zamora (Santiago del Estero), Juan Manzur (Tucumán) y Alberto Rodríguez Saá (San Luis).

En principio, no se constata grieta entre los gobernadores, pero sí cierta *indiferencia* entre unos y otros. El **76.48%** de la matriz es blanca y el *Ci* global es de **.505**, o de **.458** si se excluye a Alberto Fernández.

# **¡Quiero retruco! Gabinete presidencial**

¿Cómo se estructura una red donde, presumiblemente, la grieta no debería tener cabida? Veamos el caso del Gabinete presidencial.

Adyacencias de red no ponderadas. Colores aleatorios.

La red no ponderada se ve compacta y dominada por el nodo más grande: Alberto Fernández. Si desactivamos al Presidente (clic sobre su nombre), un usuario pasa a ocupar el centro de la escena: **Santiago Cafiero**, Jefe de Gabinete de Ministros. Hasta ahí, todo lógico. Cuando ponderamos el peso y las características de los nodos de la red, sin embargo, R nos dice que existen dos comunidades de pertenencia.

![](/media/2020/02/3-1-1008x1024.webp)

Matriz de adyacencia ponderada con grupos de pertenencia. Colores aleatorios.

Arriesgo una hipótesis: el grupo turquesa está más cohesionado en torno a *follows* y *follows back* porque muchos de sus integrantes trabajaron juntos en la Cámara de Diputados. Cierto o no, es evidente que entre ambos bloques no existe grieta: solo el **36%** de la matriz es blanca y el *Ci* global es de **.864**.

---

[![Conoce nuestros programas: https://es.theglobal.school/programs](/media/2020/02/educacion-global-Viena.webp)](https://es.theglobal.school/programs)

**Conoce nuestros programas: https://es.theglobal.school/programs**

---

# **¡Quiero vale cuatro! Presidentes de América Latina**

Pajaritos y América Latina, en mi cabeza, se resumen en un video. ¡Perdón, pero no puedo no traerlo a colación! 🐦

Ahora sí, pasemos al análisis de la red no ponderada.

> Notas:  
> • No pude dar con cuentas oficiales o activas de David Granger (Guyana), Daniel Ortega (Nicaragua), Dési Bouterse (Surinam) y Tabaré Vázquez (Uruguay).  
> • En vistas de la próxima asunción de Luis Lacalle Pou a la Presidencia de Uruguay, decidí incluirlo.  
> • En el contexto de las controversias regionales, también sumé al análisis de red a Evo Morales (Bolivia) y Juan Guaidó (Venezuela).  
> • Por último, y solo por curiosidad, incluí a Mauricio Macri.

Adyacencias de red no ponderadas. Colores aleatorios.

- La primera particularidad de esta red es que, a diferencia de las otras, tiene dos nodos completamente desconectados: **Evo Morales** y **Jovenel Moïse** (Haití). Ellos no siguen a ningún Presidente y ningún Presidente los sigue a ellos.
- En forma de apéndice encontramos a **Nicolás Maduro** que, si bien es un nodo grande, está conectado a la red por una única arista que lo vincula con **Miguel Díaz Canel** (Cuba). La posición aislada de Maduro contrasta notablemente con la de **Juan Guaidó**.
- **Andrés Manuel López Obrador** es el nodo más grande de la red y no sigue a ninguno de los otros gigantes (Bolsonaro, Macri, Maduro y Piñera).
- **Nayib Bukele** (El Salvador), el Presidente que *gobierna* a través de Twitter, no es particularmente popular en la red de Presidentes.
- **Alberto Fernández** y **Mauricio Macri** no siguen a **Jair Bolsonaro**. Jair Bolsonaro no sigue ni a Alberto Fernández ni a Mauricio Macri.

Veamos ahora qué nos dice la matriz de adyacencia con la red ponderada.

![](/media/2020/02/4-1-1024x1015.webp)

Matriz de adyacencia ponderada con grupos de pertenencia. Colores aleatorios.

Rencuentra dos eslabones aislados, Morales y Moïse, y tres grupos de pertenencia.

1. **Grupo salmón**: Alberto Fernández (Argentina), Andrés Manuel López Obrador (México), Miguel Díaz Canel (Cuba) y Nicolás Maduro (Venezuela).
2. **Grupo mostaza**: Alejandro Giammattei (Guatemala), Carlos Alvarado Quesada (Costa Rica), Danilo Medina (República Dominicana), Juan Orlando Hernández (Honduras), Laurentino Cortizo (Panamá), Lenín Moreno (Ecuador) y Nayib Bukele (El Salvador).
3. **Grupo verde**: Iván Duque Márquez (Colombia), Jair Bolsonaro (Brasil), Jeanine Áñez (Bolivia), Juan Guaidó (Venezuela), Mario Abdo (Paraguay), Martín Vizcarra (Perú), Sebastián Piñera (Chile), Luis Lacalle Pou (Uruguay) y Mauricio Macri (Argentina).

Los grupos salmón y verde parecen estar **cohesionados en torno a preferencias ideológicas**. El grupo mostaza, por su parte, es prácticamente un **club de vecinos**: con la excepción de Lenín Moreno (Ecuador), nuclea a presidentes centroamericanos.

Como en la de gobernadores, la intensidad de esta red también es baja: el **71.43%** de la matriz es blanca. O sea, hay pocos *follows* y *follows back* entre los nodos. Por su parte, el coeficiente de *clustering* global para esta red asciende a **.665**.

- Los *follows* y *follows back* en Twitter son indicadores no convencionales que vale la pena explorar para estimar la polarización dentro de un sistema político, o, acaso, para revelar las preferencias de sus actores.

![](/media/2020/02/1-2-997x1024.webp)

![](/media/2020/02/2-1-1024x986.webp)

![](/media/2020/02/3-1-1008x1024.webp)![](/media/2020/02/4-1-1024x1015.webp)

- Las dos matrices de la izquierda muestran redes intensas, ambas con muchos *follows* y *follows back* entre sus nodos. La intensidad, sin embargo, se distribuye de manera distinta. En la matriz de dirigentes políticos se concentra **dentro** de los grupos de pertenencia. En la matriz del gabinete presidencial, por su parte, se distribuye **entre** todos los nodos.
- Ambas matrices también exhiben dos grupos de pertenencia, pero eso no indica polarización *per se*. La polarización de una red está dada por la existencia de grupos de pertenencia muy intensos ***dentro de sí*** pero no ***entre sí***.
- Las matrices de la derecha dan cuenta de una escasa interconexión entre los nodos de la red, cuestión que se traduce en bajos coeficientes de *clustering* global.
- De acuerdo al coeficiente de *clustering* global, la red más agrupada y mejor conectada es la del gabinete presidencial. Por el contrario, la más dispersa y peor conectada es la de los gobernadores. ¿Debería avisarle a sus *community managers*?

![](/media/2020/02/5-1-1024x254.webp)

## [María de los Ángeles Lasa](https://medium.com/@Condolasa?source=follow_footer--------------------------follow_footer-)

Cold War freak & Space Lover ·

Violinista amateur ·

2,6% Neanderthal ·

TEDxSpeaker ·

Lic. RR.II.,

MPP & Ph.D. in Pol.Sci ·

Más en http://marialasa.com

Originalmente publicado en: [Medium](https://medium.com/@Condolasa/seguime-que-te-sigo-c35e5d102c2e)
