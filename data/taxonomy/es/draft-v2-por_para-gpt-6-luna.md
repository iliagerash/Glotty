# Taxonomy v2 draft: Por vs para (es.sem.por_para)

Drafted 2026-10-21 by openai:gpt-6-luna#medium with `npm run taxonomy:draft` from 198 real instructor-corrected errors (training pool). Not approved.

## Summary

The codes capture local meaning contrasts visible in one response and its prompt: purpose versus cause, recipient/beneficiary versus acting on someone’s behalf, duration versus deadline, route versus destination, payment/exchange, and suitability or reference. Many supplied corrections are preferences, unclear in context, or not reliably Por-vs-para contrasts, so they are assigned NONE. Unlike v1, this taxonomy has no codes for a learner’s general English-for mapping or inferred strategy, and it does not turn every conventional phrase into a separate code.

## Coverage of the sample

| Code | Name | Errors |
| --- | --- | --- |
| PRP.01 | Purpose or goal versus cause or basis | 68 |
| PRP.02 | Recipient or beneficiary versus acting on someone’s behalf | 37 |
| PRP.03 | Duration or time span versus deadline | 23 |
| PRP.04 | Route or transit versus destination | 0 |
| PRP.05 | Price, payment, or exchange | 9 |
| PRP.06 | Suitability or reference point | 18 |
| NONE | no code fits | 43 |

## Codes

### PRP.01: Purpose or goal versus cause or basis

Use when the context clearly expresses a forward-looking purpose, intended result, or reason for doing something (para), but the learner uses por; or a cause, motive, stimulus, or basis (por), but the learner uses para. Includes emotional reactions to a stimulus and a basis for being famous, grateful, or rewarded. Do not use for a direct recipient/beneficiary, payment or exchange, or a person who is the standard for an evaluation.

**Is this code:** Estudio por las clases [para las clases]: the classes are the purpose/context of study. | Estoy emocionada para ver [por ver] a mi familia: seeing them is the stimulus. | Es famoso para sus películas [por sus películas]: the films are the basis of his fame.

**Is not this code:** Compré un regalo por mi madre [para mi madre]: the mother is the recipient, not the cause. | Pagué para el libro [por el libro]: the phrase expresses payment, not purpose.

**Probe:** Choose: «Lo hizo ___ la tormenta» (cause) / «Viajó ___ aprender» (purpose).

**Practice:** `cause_vs_purpose_contrast`

Sample errors given this code:
  - Español me ha presentado a una cultura completamente diferente, que nunca hubiera conocido, y por eso estoy muy agradecido no solo para el idioma sino a que mis padres nos enviaron a mis hermanas y yo a una escuela primaria bilingüe. Por último, quiero exponer unas cosas más para tener en cuenta sobre mí. *(para -> por)* — Language is the basis of gratitude.
  - Tom Cruise es un actor estadounidense. Él es famoso para sus películas de acción. *(para -> por)* — Films are the basis of fame.
  - La razón por querer tener dos especialidades es porque espero poder ser una abogada de inmigración en el futuro.En describirme, yo diría que soy apasionada, trabajadora y sensible. *(por -> para)* — Intended reason/purpose of wanting specialties.

### PRP.02: Recipient or beneficiary versus acting on someone’s behalf

Use when a person or group is clearly the intended recipient or beneficiary of an item or action (para), but the learner uses por; or context clearly means doing something in someone’s place/on their behalf (por), but the learner uses para. Do not use for a general motive, a goal, suitability/reference, or an unclear phrase such as trabajar por alguien without enough context.

**Is this code:** Compré un perro por mi madre [para mi madre]: she is the intended beneficiary. | Cocinaba desayuno por nuestra familia [para nuestra familia]: the family is who the breakfast is for. | Trabajé para él [por él]: when the context explicitly means acting in his place.

**Is not this code:** Estudio por mi familia [para mi familia only if they are recipients]: if they are the motive, this is a cause/motive contrast. | Este tamaño es perfecto por Maya [para Maya]: this is suitability/reference, not receipt.

**Probe:** Contrast «Compré flores ___ Ana» (Ana receives them) with «Fui ___ Ana porque estaba enferma» (I went in her place).

**Practice:** `recipient_vs_behalf_practice`

Sample errors given this code:
  - Cuando, yo era nino, el compraba juguetes por mi. Mi juguete favorito estaba desde el. *(por -> para)* — Juguetes are intended for him.
  - Durante su carrera en fútbol, ella juego en 42 juegos de fútbol. Ella jugaba por los Estados Unidos mujeres equipo nacional hace 17 años y recibió FIFA’s mundo jugador del año. *(por -> para)* — Team affiliation/representation is intended.
  - Ella jugaba por los Estados Unidos mujeres equipo nacional hace 17 años y recibió FIFA’s mundo jugador del año. Madurando, su papa era un piloto en la fuerza aérea, y jugando fútbol era muy difícil porque ella mueve casas y barrios mucho, pero su hermano era muy simpatica y ayuda ella y practica con ella mucho. *(por -> para)* — Team affiliation/representation is intended.

### PRP.03: Duration or time span versus deadline

Use when a clearly stated length of time or period over which an event lasts calls for por (or a duration expression), but the learner uses para; or a clearly stated due date/deadline calls for para, but the learner uses por. Do not use for an approximate date, holiday occasion, or a phrase where duration versus deadline is not established.

**Is this code:** Practiqué el fútbol para siete años [por siete años]: a length of time. | Estuve allí para tres años [por tres años]: a time span. | Quiero estar lista por el verano [para el verano]: a target time/deadline.

**Is not this code:** El informe es para el viernes: a deadline, correctly marked. | Nos vimos por Navidad: the occasion may allow more than one framing; do not code without clearer context.

**Probe:** Choose: «Vivió allí ___ tres años» (duration) / «Entrega el trabajo ___ el viernes» (deadline).

**Practice:** `duration_vs_deadline_practice`

Sample errors given this code:
  - Quiero tener pecas y ojos de un otro color. Quiero estar delgada por el verano cuando voy al piscina. *(por -> para)* — Summer is the target time.
  - Thomas estaba en la casa de su novia donde vivía y recibió una llamada que cambiara su vida por siempre. Cuando Thomas respondió a la llamada, su jefe le dijo -Hola, Thomas. *(por -> para)* — Para siempre marks the intended time horizon.
  - Por la mañana, yo pagaré cincos pasajes de avión por el décimo de junio en el verano. Si el avión aterrizo a tiempo, nosotros llegaremos en Alaska. *(por -> para)* — June 10 is the intended travel date.

### PRP.04: Route or transit versus destination

Use when the prompt clearly establishes movement through/along a route or area (por), versus movement toward a final destination (para), and the learner selects the other preposition. Do not use for a phrase that merely names a place after caminar or ir, since that can require a different construction or may be underspecified.

**Is this code:** Pasamos para Córdoba [por Córdoba] antes de llegar a Sevilla: Córdoba is on the route. | Salimos por Madrid [para Madrid] como destino final: Madrid is the destination.

**Is not this code:** Fuimos a Granada para visitar la Alhambra: para marks purpose, not destination-versus-route. | Caminó por la biblioteca: por can correctly describe movement through a place.

**Probe:** Choose: «Para llegar a Sevilla, pasamos ___ Córdoba» versus «El tren sale ___ Sevilla, su destino final».

**Practice:** `route_vs_destination_practice`

Sample errors given this code:

### PRP.05: Price, payment, or exchange

Use when the intended relation is a price paid, payment for something, a reward, or an exchange (por), but the learner uses para. Do not use for the recipient of a purchase, the purpose of buying, or an ambiguous phrase about money without a clear transaction.

**Is this code:** Pagaría para los asientos [por los asientos]: payment for the seats. | Vender los autógrafos para dinero [por dinero]: money received in exchange. | Ofrecían cuarenta mil dólares para su captura [por su captura]: a reward for the capture.

**Is not this code:** Compré un libro para mi hermano: the brother is the recipient. | Compré un libro para estudiar: studying is the purpose.

**Probe:** Choose: «Te vendo la bicicleta ___ cien euros» (price/exchange) / «Compré la bicicleta ___ mi hermana» (recipient).

**Practice:** `payment_and_exchange_frames`

Sample errors given this code:
  - La tienda estaba muy preocupada y había muchos clientes y una línea larga. Cuándo el dueño la vio, él estaba muy feliz y la ofreció una pintura gratis para su ayuda. *(para -> por)* — Painting is offered in exchange for help.
  - Lo primero que haría es asegurarme que sería durante la temporada de fútbol, especialmente durante el clásico. Como esto es una sola oportunidad de la vida, yo pagaría para los asientos más cerca para tener la mejor experiencia. Luego, el próximo destino sería París, Francia, en cual visitará el Torre Eiffel y luego a un restaurante de cinco estrellas para tomar café caro y probar la comida rica. *(para -> por)* — Seats are what the money buys.
  - Cuando encuentras el lugar que te gusta, puedes decidir la fecha que quieres ir, y al mismo tiempo tomar en cuenta lol tiempos que va más gente o si es un tiempo cuando hay eventos especiales. Cuando tienes las fechas, puedes a mirar cuales hoteles están disponible y comparar los precios para que consigues el mejor hotel para el precio. *(para -> por)* — Price is the exchange/value relation.

### PRP.06: Suitability or reference point

Use when para marks what is suitable, beneficial, difficult, important, or true from a stated person’s or thing’s point of view, but the learner uses por. Do not use when the person is simply a recipient, or when por clearly marks the cause or stimulus of an emotion.

**Is this code:** Es una ventaja por mí [para mí]: the advantage is evaluated with respect to the speaker. | Era el tamaño perfecto por Maya [para Maya]: it suited Maya. | Es bueno por la salud [para la salud]: it is beneficial for health.

**Is not this code:** Estoy triste por mi amiga: she is the stimulus/cause of sadness, not a reference standard. | Compré ropa para mi madre: she is the recipient, not the evaluation point.

**Probe:** Choose: «Es difícil ___ mí» (reference/experiencer) versus «Estoy triste ___ mí» meaning ‘because of myself’ (cause).

**Practice:** `suitability_and_reference_practice`

Sample errors given this code:
  - Pero, lo siento, porque Ellen no es una persona me cae bien porque ella es muy fuerte y una persona muy genial por la sociedad. Ella me gusta porque simplemente porque ella es muy cómica. *(por -> para)* — Goodness is evaluated for society.
  - En facto, esta mecadore fue el tamaño perfecto por Maya. “Sientate”, dijo Abuelo Antony. *(por -> para)* — The chair’s fit is evaluated for Maya.
  - Estudio económica porque quiero entender los eventos que ocurrió en todo el mundo. Quiero trabajar en una empresa internacional porque me encanta conocer la gente diferente y puedo hablar tres lenguas que es una ventaja por mí. *(por -> para)* — Advantage is evaluated with respect to the speaker.

## No code (NONE)

  - Cree en el amor, pero no creía en el amor por sí mismo. Ocultó su dolor trabajando y gastando dinero en cosas que lo distrajeran de su soledad. *(por -> para)* — Por sí mismo is plausible as written.
  - Aquí es una historia pequeña que yo pienso describir mi: un mes hace, más o menos, mi amiga tuvo una fiesta para su cumpleaños. Ella y cinco otros bebían cervezas y fumaban, mientras me sentía en la mesa comía hummus y un grande tazón de frutas. *(para -> por)* — Birthday occasion allows both framings.
  - Ella quiere visitar Estudios Universales para Harry Potter. Ella también quiere visitar Europa. *(para -> por)* — Harry Potter relation is unclear.
  - Pienso que los dos razones son porque somos tan juntos y amables por una familia de cuarto. Una de las otras personas en mi vida que no puedo vivir sin ella es mi mejor amiga "Soap". *(por -> para)* — Meaning of family phrase is unclear.
  - Jamás necesitaba enmendar sus ropas viejas. El hombre solo preguntó para su menor hijo. *(para -> por)* — Meaning of preguntó para su hijo is unclear.
  - Hay muchas razones por esto. Primero, mi abuela es una persona fantastica. *(por -> para)* — Por esto can be acceptable here.
  - Luego en diciembre volvimos a visitarme para Navidad. Ya que hemos estado planeando para mí para visitarlo y ver su lado del mundo en agosto. *(para -> por)* — Correction and intended relation are unclear.
  - Por eso mi hermana siempre va ser la persona mas especial en mi vida. Ella hacía mucho para mí y todavía hace mucho para mí aunque no lo tenga que hacer. *(para -> por; para -> por)* — Para mí is acceptable for beneficiary here.
  - Pero me quedé en el dormitorio para a la lluvia y el mal aire. Vi una película, pero esta película fue aburrida. *(para -> por)* — The relation to rain is unclear.
  - Anos después, ella tiene una película por su carácter solo que se llama "Finding Dory." En estas películas, Ellen dije unas frases memorables como "Solo sigue nadando. *(por -> para)* — Meaning of a film por su carácter is unclear.
  - Hoy en día todavía hay dificultades y queda mucho para aprender sobre la enfermedad, pero la diabetes nunca me va a contener de conseguir mis sueños. En realidad, recibir este diagnostico me ha demostrado lo fuerte que soy en enfrentar ese problema con éxito. *(para -> por)* — Queda mucho por aprender is a different construction.
  - Además de esto, tengo una pasión para la medicina preventiva, especialmente entre los jóvenes. Quiero perseguir mi meta de hacer un impacto en las vidas de los niños en areas subrepresentados donde la obesidad es un problema prevalante. *(para -> por)* — Pasión por is a lexical collocation, not a clear contrast here.

## Left out

I left out global patterns such as English-for transfer, inconsistency across a learner’s history, avoidance, and lack of a stable system because they cannot be diagnosed from one response. I also left out a general fixed-expression code: items such as gracias por can be handled as conventional examples within the relevant meaning practice, not as evidence of a learner strategy. Several supplied changes appear preferential, unclear, or not actually a por/para contrast—especially some motion, votar por, buscar, and para/por occasion phrases—so those receive NONE rather than being forced into a code.
