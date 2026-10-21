# Taxonomy v2 draft: Por vs para (es.sem.por_para)

Drafted 2026-10-21 by openai:gpt-6-luna#medium with `npm run taxonomy:draft` from 105 real instructor-corrected errors (training pool), revised against the review in `data/taxonomy/es/review-v2-claude.md` (previous draft: `draft-v2-por_para-gpt-6-luna.prev.json`). Not approved.

## Summary

The seven codes capture local, prompt-supported contrasts: purpose/use versus cause or basis; recipient/employer versus support or acting for someone’s sake; duration versus deadline; payment or exchange; evaluative reference or suitability; and emotional or attitudinal objects. PRP.04 is limited to value given or received in exchange, not merit as the basis of praise. Following the review, emotion frames are separated from general cause/purpose, and support/advocacy is distinguished from a recipient. I did not add the review’s proposed governed-preposition/no-preposition code: those cases are not meaning contrasts between por and para, so they receive NONE. I also omitted route versus destination because this sample does not support a clear instance. Unlike v1, no code infers a learner-wide strategy or treats a correction as proof of error; uncertain or questionable targets are left unassigned.

## Coverage of the sample

| Code | Name | Errors |
| --- | --- | --- |
| PRP.01 | Purpose or intended use versus cause or basis | 26 |
| PRP.02 | Recipient or employer versus support or acting for someone’s sake | 19 |
| PRP.03 | Duration span versus deadline or target time | 12 |
| PRP.04 | Payment or exchange | 6 |
| PRP.05 | Evaluative reference or suitability | 12 |
| PRP.06 | Emotion or attitude toward an object | 17 |
| NONE | no code fits | 13 |

## Codes

### PRP.01: Purpose or intended use versus cause or basis

Use when para marks an action’s goal or an item’s intended use, but the learner uses por; or when por marks a cause, motive, basis, or passive agent, but the learner uses para. Do not use for emotional or attitudinal frames (PRP.06), evaluative predicates (PRP.05), recipients or support for someone (PRP.02), or a relation determined by a neighbouring word rather than this meaning contrast.

**Is this code:** Volvimos a la tienda por buscarlo [para buscarlo]: searching is the goal. | Un tazón de café es importante por escalar rocas [para escalar rocas]: the activity is what it is useful for. | Es famoso para sus películas [por sus películas]: the films are the basis of his fame. | La política y la ciencia son afectadas para nuestra historia [por nuestra historia]: the history is the agent or cause.

**Is not this code:** Estoy emocionada para ver a mi familia [por ver]: an emotional frame, PRP.06. | Este tamaño es perfecto por Maya [para Maya]: suitability, PRP.05. | Compró ropa por su padre [para su padre]: the father is the recipient, PRP.02.

**Probe:** Choose the contrast in context: «Se quedó en casa ___ la lluvia» (cause) / «Volvió ___ buscar las llaves» (purpose). Then distinguish an emotion frame: «Está agradecida ___ tu ayuda».

**Practice:** `cause_basis_vs_goal_practice`

Sample errors given this code:
  - Tom Cruise es un actor estadounidense. Él es famoso para sus películas de acción. *(para -> por)* — Films are the basis of fame.
  - Ella quiere visitar Estudios Universales para Harry Potter. Ella también quiere visitar Europa. *(para -> por)* — Harry Potter is the reason/theme for the visit.
  - Tomé mucho tiempo para obtener todos los cosas por la casa, pero nosotros terminamos. Espero que puedo ir a España el proximo verano para estudiar algo. *(por -> para)* — Things are intended for use in the house.

### PRP.02: Recipient or employer versus support or acting for someone’s sake

Use when para identifies the recipient, beneficiary, audience, employer, or team, but the learner uses por; or when por means in support of, for the sake of, in place of, or in honour of someone or a cause, but the learner uses para. For actions involving family or friends, use only when the context clearly establishes the intended relation; otherwise abstain. Do not use for an item’s purpose or intended use (PRP.01), payment (PRP.04), or an emotional attitude toward someone (PRP.06).

**Is this code:** Quiero comprar una casa y un perro por mi madre [para mi madre]: she is the intended beneficiary. | Trabajan por S.H.I.E.L.D. [para S.H.I.E.L.D.]: the organization is the employer. | Cocinaba desayuno por nuestra familia [para nuestra familia]: the family is the intended recipient. | Hago todo para mi papá [por mi papá]: the context presents the action as being for his sake.

**Is not this code:** La medicina es por las pulgas [para las pulgas]: intended use, PRP.01. | Estoy agradecido para mi familia [por mi familia]: emotional attitude, PRP.06. | Vendió los autógrafos para dinero [por dinero]: exchange, PRP.04.

**Probe:** Contrast «Compré flores ___ Ana» when Ana receives them with «Voté ___ Ana» when expressing support for her candidacy.

**Practice:** `recipient_vs_support_practice`

Sample errors given this code:
  - Ella y yo somos muy buenas amigas. Yo quiero comprar una casa grande y un perro por mi madre. *(por -> para)* — Mother is the intended beneficiary.
  - Todos ellos trabajan por S.H.I.E.D. está en Neuva York, U.S.A. Señor Stark está comprometido con su novia. Su novia se llama Pepper. *(por -> para)* — Organization is the employer.
  - Ella estaba sorprendida porque su arte es muy hermosa. Ella compró dos pinturas y decidió que iba a ayudarle con su publicidad porque trabajaba por una revisa. *(por -> para)* — The magazine is the employer.

### PRP.03: Duration span versus deadline or target time

Use when the context clearly gives a length of time or span over which something lasts, but the learner uses para instead of por or another suitable duration expression; or when a deadline or target time calls for para but the learner uses por. Accept durante, desde hace, or no preposition when those are the natural correction. Do not use for frequency, approximate occasions, or an unclear time relation.

**Is this code:** Ella ha estado en mi vida para dos años [por dos años / durante dos años]: a duration. | He estudiado español para cinco años [por cinco años / durante cinco años]: a duration. | Quiero estar delgada por el verano [para el verano]: the summer is the target time. | Estaba emocionada para mi graduación [por mi graduación]: the graduation is the relevant target occasion.

**Is not this code:** El informe es para el viernes: para correctly marks a deadline. | Nos vimos por Navidad: an occasion reading does not by itself establish a duration/deadline error. | Voy cuatro días a la semana: frequency, not a duration contrast.

**Probe:** Choose: «Vivió allí ___ tres años» (duration) / «Entrega el trabajo ___ el viernes» (deadline).

**Practice:** `duration_vs_deadline_practice`

Sample errors given this code:
  - Quiero tener pecas y ojos de un otro color. Quiero estar delgada por el verano cuando voy al piscina. *(por -> para)* — Target time: para el verano.
  - Por la mañana, yo pagaré cincos pasajes de avión por el décimo de junio en el verano. Si el avión aterrizo a tiempo, nosotros llegaremos en Alaska. *(por -> para)* — June 10 is the target date for the tickets.
  - Cuando llegamos, nosotros fuimos a la playa a nadar para muchas horas. A la playa, también jugamos al fútbol con otra gente y fue muy divertido. *(para -> por)* — Many hours is a duration.

### PRP.04: Payment or exchange

Use when the intended relation is a price paid, money received in exchange, or value offered as a reward in return for something, normally marked by por, but the learner uses para. Do not use for merit or blame as the basis of a judgment (PRP.01), a recipient (PRP.02), or an unclear statement about having money.

**Is this code:** Pagaría para los asientos [por los asientos]: payment for the seats. | Vender los autógrafos para dinero [por dinero]: money received in exchange. | Ofrecían cuarenta mil dólares para su captura [por su captura]: a bounty offered in exchange for the capture.

**Is not this code:** Ella recibió premios para su trabajo [por su trabajo]: por gives the basis or merit for recognition, PRP.01. | Compré un regalo para mi hermano: para marks the recipient, PRP.02. | No tiene dinero para su trabajo: without clearer context, the intended relation is uncertain.

**Probe:** Choose: «Te vendo la bicicleta ___ cien euros» (exchange) / «Compré la bicicleta ___ mi hermana» (recipient).

**Practice:** `payment_exchange_frames`

Sample errors given this code:
  - La tienda estaba muy preocupada y había muchos clientes y una línea larga. Cuándo el dueño la vio, él estaba muy feliz y la ofreció una pintura gratis para su ayuda. *(para -> por)* — Painting is offered in return for help.
  - Lo primero que haría es asegurarme que sería durante la temporada de fútbol, especialmente durante el clásico. Como esto es una sola oportunidad de la vida, yo pagaría para los asientos más cerca para tener la mejor experiencia. Luego, el próximo destino sería París, Francia, en cual visitará el Torre Eiffel y luego a un restaurante de cinco estrellas para tomar café caro y probar la comida rica. *(para -> por)* — Seats are what the speaker would pay for.
  - Cuando encuentras el lugar que te gusta, puedes decidir la fecha que quieres ir, y al mismo tiempo tomar en cuenta lol tiempos que va más gente o si es un tiempo cuando hay eventos especiales. Cuando tienes las fechas, puedes a mirar cuales hoteles están disponible y comparar los precios para que consigues el mejor hotel para el precio. *(para -> por)* — Hotel value is related to the price paid.

### PRP.05: Evaluative reference or suitability

Use when para marks the person, group, or purpose with respect to which something is suitable, beneficial, difficult, important, late, or an advantage, but the learner uses por. Do not use when para expresses the goal of an action (PRP.01), when the person receives something (PRP.02), or when an emotion is directed toward someone or something (PRP.06).

**Is this code:** Es una ventaja por mí [para mí]: the advantage is evaluated with respect to the speaker. | El tamaño perfecto por Maya [para Maya]: the size suits Maya. | No son sencillas por él [para él]: the difficulty is evaluated from his point of view. | Llegó tarde por su primer día [para su primer día]: the timing is relative to the event.

**Is not this code:** Estoy triste por él: por can correctly mark the person who prompts the sadness, PRP.06 rather than an evaluation. | Volvió para estudiar: this is an action goal, PRP.01. | Compré ropa para Maya: Maya is the recipient, PRP.02.

**Probe:** Choose: «Este ejercicio es difícil ___ los principiantes» (evaluation) / «Lo castigaron ___ mentir» (cause).

**Practice:** `evaluative_reference_practice`

Sample errors given this code:
  - Pero, lo siento, porque Ellen no es una persona me cae bien porque ella es muy fuerte y una persona muy genial por la sociedad. Ella me gusta porque simplemente porque ella es muy cómica. *(por -> para)* — Genial is evaluated with respect to society.
  - Estudio económica porque quiero entender los eventos que ocurrió en todo el mundo. Quiero trabajar en una empresa internacional porque me encanta conocer la gente diferente y puedo hablar tres lenguas que es una ventaja por mí. *(por -> para)* — Advantage is evaluated with respect to the speaker.
  - Me gusta escalar rocas porque es difícil y divertido. Un tazo de café es importante por escalar rocas porque Usted necesita estar valiente y tener energía. *(por -> para)* — Importance is evaluated relative to rock climbing.

### PRP.06: Emotion or attitude toward an object

Use when an emotion or attitude toward a person, event, action, or thing is expressed with a learner’s para where the intended Spanish frame uses por (for example, agradecido por, emocionado por, triste por, tener miedo por, tener respeto por). Do not use for a cause that is not the object of an emotion or attitude (PRP.01), a beneficiary (PRP.02), or an evaluative predicate such as difícil para (PRP.05). Other Spanish frames, such as emocionado de, may also be acceptable; do not code an acceptable alternative.

**Is this code:** Estoy emocionada para ver a mi familia [por ver a mi familia]: anticipation directed toward the event. | Mi familia está emocionada para mí [por mí]: the emotion is concern or happiness for the speaker. | Tengo mucho respeto para ella [por ella]: respect toward a person. | Gracias para escuchar [por escuchar]: gratitude for the act.

**Is not this code:** Se quedó en casa por la lluvia: por marks a cause, PRP.01. | Compró una casa para su madre: para marks a recipient, PRP.02. | Es difícil para mí: para marks an evaluative reference, PRP.05.

**Probe:** Choose: «Estoy agradecida ___ tu ayuda» / «Estudié ___ conseguir un trabajo»; the first is an attitude frame, the second a purpose.

**Practice:** `emotion_attitude_por_frames`

Sample errors given this code:
  - Español me ha presentado a una cultura completamente diferente, que nunca hubiera conocido, y por eso estoy muy agradecido no solo para el idioma sino a que mis padres nos enviaron a mis hermanas y yo a una escuela primaria bilingüe. Por último, quiero exponer unas cosas más para tener en cuenta sobre mí. *(para -> por)* — Gratitude toward the language.
  - Estoy emocionada y nerviosa pero mi familia sólo está emocionada para mi. Después de la graduación quiero viajar a España y Grecia. *(para -> por)* — Family is the object of the emotion.
  - Fue mi primer año en la universidad y estaba muy nerviosa para empezar el proceso de adaptarme al cambio. Por eso, fui a una librería debido a que los libros son mi hogar fuera de la casa. *(para -> por)* — Nervousness is directed toward starting.

## No code (NONE)

  - Cree en el amor, pero no creía en el amor por sí mismo. Ocultó su dolor trabajando y gastando dinero en cosas que lo distrajeran de su soledad. *(por -> para)* — Self-love wording and target are unclear.
  - La razón por querer tener dos especialidades es porque espero poder ser una abogada de inmigración en el futuro.En describirme, yo diría que soy apasionada, trabajadora y sensible. *(por -> para)* — Reason noun governs the construction; not a clear contrast.
  - Jamás necesitaba enmendar sus ropas viejas. El hombre solo preguntó para su menor hijo. *(para -> por)* — Preguntar por is a governed frame, not this contrast.
  - Hay muchas razones por esto. Primero, mi abuela es una persona fantastica. *(por -> para)* — Razones para is a noun construction, not a clear meaning contrast.
  - Anos después, ella tiene una película por su carácter solo que se llama "Finding Dory." En estas películas, Ellen dije unas frases memorables como "Solo sigue nadando. *(por -> para)* — The relation between film and character is unclear; likely needs sobre.
  - Hoy en día todavía hay dificultades y queda mucho para aprender sobre la enfermedad, pero la diabetes nunca me va a contener de conseguir mis sueños. En realidad, recibir este diagnostico me ha demostrado lo fuerte que soy en enfrentar ese problema con éxito. *(para -> por)* — Quedar por is a lexical frame, not a clear contrast here.
  - También yo he cantado por la parada en el Día de Independencia en mi puebo pequeño. En conclusión, soy una persona con una actitúd positiva y tengo un montón de intereses desde los deportes a la música. *(por -> para)* — At the parade likely needs en; para target is questionable.
  - Dormimos en la casa de nuestra vecina para la noche. Desde entonces, dimos a él el nombre "héroe. *(para -> por)* — Por la noche is not clearly a duration contrast here.
  - Les dijo que era por una mejor oportunidad. No quería que sus tres hijos tenian que crecer y trabajar en las granjas o hacer trabajo físico. *(por -> para)* — Por una mejor oportunidad can express the motive; target unclear.
  - El maestro nos dijo que el resto de grupo quiso ir al baño y que tuvimos que quedarnos allá y esperar para ellos. Le dijimos que eso estuvo bien y que les esperaramos. *(para -> por)* — Esperar por ellos is not a clear por/para meaning contrast.
  - El Presidente Trump es muy buen Presidente, él no es la mejor persona moralmente, pero él se preocupa por América. no tiene dinero para su trabajo, y trabaja largas horas. *(para -> por)* — Money for versus received for the work is unclear.
  - Cada día, buscamos en los refugios de animales para Buttercup pero no tuvimos suerte. Desafortunamente, Buttercup fue asesinado por un coyote. *(para -> por)* — Buscar Buttercup takes a different construction; por target is questionable.

## Left out

I left out global English-for transfer, inconsistent use across a learner’s history, avoidance, and any claim that a learner has no system; these are not diagnosable from one response. I also left out route versus destination because no supplied correction establishes that contrast clearly. Several corrections involving governed expressions or a different required preposition—such as preguntar por, esperar a/por, buscar a, razón para, and quedar por—are not coded: they do not identify a por-versus-para meaning contrast. Questionable targets and ambiguous relations receive NONE rather than being treated as learner errors.
