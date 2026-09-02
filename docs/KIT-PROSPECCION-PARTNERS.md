# Kit de prospección de partners

**Para qué sirve:** pasar de 2 partners activos a 4 o 5. Es material de trabajo, para usar y editar, no un documento de estrategia.

**Qué hay aquí:** la aritmética del objetivo, a quién buscar, dónde encontrarlo, la secuencia de contacto lista para copiar, el guion de la primera llamada, las objeciones con su respuesta, y qué medir.

**Material de apoyo que ya existe:** la propuesta completa en [es.theglobal.school/aliados](https://es.theglobal.school/aliados/) (y `/partners/` en inglés), la ficha imprimible de la alianza en `/aliados/ficha/`, y la ficha imprimible de cada viaje en `/experiencias/<slug>/ficha/`.

---

## 1. La aritmética, para no prospectar a ciegas

Los números que conocemos: capacidad de **6 a 8 cohortes al año**, **4 vendidas**, **2 partners activos** con 2 cada uno.

De ahí sale el objetivo real, y es más pequeño de lo que parece:

| | |
|---|---|
| Cohortes que faltan para llenar capacidad | 2 a 4 |
| Ritmo observado por partner activo | ~2 cohortes/año |
| Partners activos necesarios | 4 (no 10) |
| Partners a firmar para tener 4 activos | 6 a 8 |

Ese último salto es el que suele sorprender: **no todo el que firma vende**. Contando con que la mitad no llegue a cerrar su primera cohorte, hay que firmar entre 6 y 8 para tener 4 produciendo.

Y hacia arriba del embudo, con supuestos prudentes que conviene sustituir por datos reales en cuanto los tengas: si 1 de cada 4 conversaciones cualificadas acaba en firma, hacen falta **entre 25 y 35 conversaciones cualificadas**. A 8 conversaciones al mes son unos 4 meses de prospección. Es un trimestre de trabajo, no un año.

**Lo que hay que evitar:** firmar muchos partners flojos. Un partner que no vende no es neutro, consume reuniones, materiales y tu tiempo de diseño, y ocupa el hueco mental de un mercado. Mejor 4 que venden que 12 en el papel.

---

## 2. A quién buscar

Cinco tipos, ordenados por facilidad de cierre según lo que ya funciona.

### a) Agencia u operador corporativo de viajes
El encaje más directo: ya vende viajes, ya tiene clientes corporativos, y le falta el brazo europeo.
- **Señal de encaje:** organiza viajes de incentivos o convenciones fuera de su país, tiene equipo comercial propio, factura en divisa.
- **Descalifica:** solo hace turismo de ocio, ticket medio bajo, vende por volumen y precio.

### b) Universidad o escuela de negocios con posgrado
La venta institucional que llena una cohorte de una sola vez.
- **Señal de encaje:** tiene maestrías o posgrados ejecutivos, ya hace o quiere hacer viajes de estudios, cobra matrícula alta.
- **Dónde está la decisión:** dirección de posgrado o de internacionalización, no el rector.
- **Descalifica:** presupuesto público rígido sin partida para movilidad.

### c) Consultora de formación o desarrollo directivo
Vende programas a empresas y le falta el producto insignia.
- **Señal de encaje:** cartera de clientes corporativos recurrente, ya vende formación de varios miles por persona.
- **Descalifica:** solo formación online de bajo precio.

### d) Cámara de comercio, gremio o asociación profesional
Tiene la convocatoria hecha y la confianza puesta.
- **Señal de encaje:** organiza misiones comerciales o delegaciones al extranjero, tiene base de socios activa.
- **Ojo:** el ciclo de decisión es lento y a veces necesita aval de junta. Cuando cierra, cierra grande.

### e) Organizador de eventos con comunidad propia
El que ya llena salas.
- **Señal de encaje:** comunidad cautiva propia (lista, evento anual, audiencia), no comprada.
- **Descalifica:** audiencia grande pero sin poder de compra.

**Filtro común, tres preguntas.** Si alguna se responde con no, no es partner:
1. ¿Tiene ya a quién vender, sin comprar audiencia desde cero?
2. ¿Ha vendido antes algo de ticket alto (varios miles por persona)?
3. ¿Hay alguien concreto que cierra ventas, con nombre y cargo?

---

## 3. Dónde encontrarlos

### Los canales templados primero, que es donde está el retorno rápido

**+600 ex participantes.** El activo más desaprovechado. Muchos son directivos, funcionarios o académicos que hoy están en posición de comprar o de recomendar. No les escribas para reclutarlos como partners, escríbeles para preguntar a quién conocen y qué necesita su organización. Un ex participante que te presenta a su director de posgrado vale más que cincuenta correos en frío.

**Instituciones con las que ya has trabajado.** Vienna School of Quality & Innovation, Impact Hub Vienna, MDV, CAGG, Champions of Our Planet, iSCAN, Booster IIT, 1MillionStartups, The Climate Reality Project. Ya conocen tu operación, y varias tienen red en América Latina.

**Las organizaciones de tus testimonios.** UNODC Colombia, Academia Regional de la ONU, Sistema Estatal Anticorrupción de México, Dirección de Gestión Ambiental de Santo Domingo. Son compradores institucionales con caso de éxito ya vivido.

**La red de los Latin American Leaders Awards.** Hay 88 nominados con país y organización en `migration/lala_nominees.json`: México 38, Colombia 19, Costa Rica 6, Chile 5, Argentina 4, Ecuador 3. Es la red más grande y cualificada que tienes a mano.

> **Dos advertencias importantes sobre esta red.** Primera: el premio lo organiza Pro-Latam, no The Global School, y acabamos de corregir en Google justo esa confusión de atribución. Escribirles desde TNGS invocando el premio la reintroduce. Segunda: son datos personales recogidos para un proceso de nominación, no para prospección comercial; usarlos como lista de envío es un problema de consentimiento con el RGPD encima. Úsala como lo que es: gente con la que hay relación previa, contactada de una en una y por su nombre, preferiblemente desde Pro-Latam o con una presentación. No la conviertas en una campaña.
>
> Nota técnica: el campo `contact` de ese JSON está mal guardado (el extractor metió una cadena donde esperaba un objeto y quedó desparramada en claves por carácter). Si algún día se usa ese dataset en serio, hay que arreglar `migration/extract_lala_nominees.mjs`.

### Búsqueda en frío, con criterio

**Prioriza por donde ya tienes rastro**, no por tamaño de mercado: México y Colombia primero (es donde está la mayoría de tu red), después Chile, Costa Rica, Ecuador, Perú y Argentina.

**Cadenas de búsqueda en LinkedIn** que dan resultados útiles:
- `"viajes de incentivos" OR "misiones comerciales" director` filtrado por país
- `"director de posgrado" OR "internacionalización" universidad` filtrado por país
- `"desarrollo directivo" OR "formación ejecutiva" gerente comercial`

**Directorios que valen la pena:** las cámaras binacionales (Cámara Mexicano-Alemana, Cámara Colombo-Suiza y equivalentes) tienen listas de socios públicas y sus miembros ya piensan en Europa. Las asociaciones de agencias de viajes corporativas de cada país publican padrón. Los rankings locales de escuelas de negocios te dan las 20 con posgrado ejecutivo de un país en una tarde.

---

## 4. La secuencia de contacto

Cuatro toques en tres semanas. Después, se para y se retoma en seis meses. Insistir más quema la marca.

**Antes de escribir:** mira su web dos minutos y localiza un programa, viaje o evento concreto suyo. Sin ese detalle, el correo es plantilla y se nota.

### Correo 1, el de apertura

> **Asunto:** Operación en Europa para [programa concreto de ellos]
>
> Hola [nombre],
>
> Vi que [organizan / venden] [el detalle concreto: su diplomado, su misión a Europa, su viaje de incentivos]. Les escribo por si les sirve tener un operador local en Europa.
>
> Somos The Global School, con base en Viena. Diseñamos y operamos programas educativos en Europa desde 2010, más de 200 viajes y eventos. El modelo con socios comerciales es simple: nosotros ponemos el producto y asumimos el 100% de la operación europea, ustedes venden con su marca y fijan su margen sobre nuestros costos netos.
>
> El reparto completo está aquí, en dos minutos de lectura: es.theglobal.school/aliados
>
> ¿Tiene sentido una llamada de 20 minutos para ver si encaja con lo que ya venden?
>
> [firma]

Reglas del correo 1: menos de 150 palabras, un solo enlace, una sola pregunta, nada adjunto. Adjuntar en el primer contacto baja la entrega y parece envío masivo.

### Correo 2, a los 4 días laborables: la prueba

> **Asunto:** Re: Operación en Europa para [programa]
>
> Hola [nombre], por si el momento no era bueno.
>
> Le dejo la ficha de un programa concreto para que vea el nivel de detalle con el que llega empaquetado: [enlace a /experiencias/<slug>/ficha/]. Itinerario día a día, qué incluye, y los costos B2B se los paso en la llamada.
>
> Si esto no es para ustedes, dígamelo y no insisto.
>
> [firma]

Ese "dígamelo y no insisto" sube la tasa de respuesta, y las negativas que trae también son útiles: limpian la lista.

### Toque 3, a los 4 días: LinkedIn

Solicitud de contacto con nota de dos líneas: quién eres, qué ofreces, sin enlace. Solo abre el canal.

### Correo 4, a los 10 días: el cierre del intento

> **Asunto:** Cierro el tema por ahora
>
> Hola [nombre], entiendo que no es prioridad ahora y dejo de escribirle.
>
> Si en algún momento un socio operativo en Europa les hace falta, aquí estamos. Y si conoce a alguien a quien le sirva más que a usted, se lo agradezco.
>
> [firma]

---

## 5. La primera llamada, 20 minutos

**Los primeros 10 minutos son para escuchar, no para presentar.** Seis preguntas, en este orden:

1. ¿A quién le venden hoy, y cuál es su ticket medio?
2. ¿Han vendido algo internacional antes? ¿Cómo salió?
3. ¿Quién cierra las ventas en su equipo?
4. ¿Cuántas personas podrían convocar para un programa de este tipo en un año?
5. ¿Qué les ha frenado hasta ahora para ofrecer algo así?
6. ¿Cómo deciden ustedes una alianza nueva, y en qué plazo?

**Lo que dices tú, con números y sin adornos:** desde 2010, más de 200 viajes y eventos, más de 600 ex participantes, base en Viena, capacidad para 6 a 8 cohortes al año, grupos de 15 a 25. Tú asumes toda la operación europea, ellos venden y cobran. Costos netos por participante y su margen lo fijan ellos.

**Sé claro con la capacidad, es una ventaja, no una limitación.** Operas de 6 a 8 cohortes al año porque los grupos son reducidos y el programa está cuidado. La escasez es real y hace que un socio serio quiera asegurar su hueco.

**Cierre de la llamada, siempre con un siguiente paso concreto y con fecha:** o les mandas costos B2B de dos formatos, o agendas una segunda llamada con quien decide. Nunca "te mando información y hablamos".

---

## 6. Objeciones y respuestas

**"Es muy caro para mi mercado."**
El precio al público lo fijan ellos: reciben costos netos. Si el ticket no encaja, se ajusta el formato, menos días, otra ciudad, grupo más grande. Pregunta cuál es el techo real de su cliente y trabaja hacia atrás desde ahí.

**"Mis clientes no viajan a Europa."**
Puede que sea cierto y entonces no es tu partner. Pero antes comprueba si el freno era el precio o la falta de un producto creíble. Muchos no lo ofrecen porque no tenían con quién operarlo.

**"¿Qué exclusividad tengo en mi país?"**
Se acuerda caso por caso según mercado y volumen comprometido, y no es automática. Si la piden en el primer contacto sin haber vendido nada, es señal de que quieren bloquear el territorio sin trabajarlo.

**"¿Por qué no lo organizo yo directamente?"**
Pueden, y algunos lo intentan. Lo que compran es no tener que construir quince años de relaciones con sedes institucionales, proveedores y ponentes en Europa, ni asumir el riesgo operativo a 10.000 kilómetros. Cuéntales qué pasa cuando un hotel cancela tres días antes.

**"¿Quién responde si algo sale mal en el viaje?"**
La operación en destino es tuya, con coordinación local. La relación con el cliente final y la cobranza son suyas. Está escrito en el contrato marco, y ese reparto claro es parte de lo que se les ofrece.

**"Mándame información y lo veo."**
La respuesta es un siguiente paso con fecha: "Te mando la propuesta hoy. ¿Te llamo el jueves a las 10 para verla juntos?" La información sin cita agendada no avanza.

---

## 7. Qué medir

Cinco números por mes. Si no se miden, no se sabe dónde se rompe el embudo:

| Métrica | Referencia inicial |
|---|---|
| Contactos nuevos abiertos | 8 a 10 |
| Respuestas obtenidas | 2 a 3 |
| Llamadas realizadas | 2 |
| Partners cualificados (pasan el filtro de 3 preguntas) | 1 |
| Partners firmados | 1 cada 2 meses |

Las referencias son supuestos de partida: sustitúyelas por tus datos reales en cuanto tengas dos meses de actividad. Lo que importa es ver **en qué paso se cae la gente**, porque el arreglo es distinto en cada caso. Si no hay respuestas, el problema es el correo o la lista. Si hay llamadas pero no cualifican, el problema es a quién estás eligiendo. Si cualifican pero no firman, el problema es la propuesta económica.

**Registra las conversaciones en algún sitio desde el primer día**, aunque sea una hoja de cálculo. Hoy no sabes la conversión de tus partners porque cada uno lleva su propio CRM; no repitas eso con tu propia prospección.

---

## 8. Tres errores que cuestan el trimestre

**Vender el viaje en vez de la alianza.** El partner no compra un viaje, compra una línea de ingresos sin carga operativa. El itinerario de Viena le interesa después, para vendérselo a su cliente.

**Prospectar sin haber cerrado el contrato marco.** Si llegas a un sí sin tener listo el acuerdo (ver [BLINDAJE-PARTNERS.md](BLINDAJE-PARTNERS.md)), pierdes semanas de impulso justo en el mejor momento. Ten el marco y la orden de grupo antes de abrir la primera conversación.

**Confundir interés con compromiso.** Un partner está activo cuando ha puesto una fecha en el calendario y ha pagado el primer hito. Todo lo anterior es conversación.
