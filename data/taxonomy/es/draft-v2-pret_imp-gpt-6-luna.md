# Taxonomy v2 draft: Preterite vs imperfect (es.gram.aspect.pret_imp)

Drafted 2026-10-21 by openai:gpt-6-luna#medium with `npm run taxonomy:draft` from 200 real instructor-corrected errors (training pool), revised against the review in `data/taxonomy/es/review-v2-claude.md` (previous draft: `draft-v2-pret_imp-gpt-6-luna.prev.json`). Not approved.

## Summary

The revised set has five local contrasts: background states/descriptions (ASP.01), dynamic actions viewed as ongoing or completed (ASP.02), routines versus bounded series (ASP.03), state verbs whose aspect changes their meaning (ASP.04), and imperfect forms used for bounded episodes or whole-event evaluations (ASP.05). This keeps the useful local contrasts from v1 while dropping strategy-level labels such as L1 transfer and narrative flattening, and it avoids treating duration words or temporal markers as automatic rules. Following the review, ASP.01 and ASP.05 separate the two directions previously bundled together; ASP.04 is limited to contexts that establish the state-verb meaning. NONE is used for preferences, unclear contexts, non-aspect corrections, and cases where the instructor’s target is not clearly required.

## Coverage of the sample

| Code | Name | Errors |
| --- | --- | --- |
| ASP.01 | Background state or description marked as a bounded event | 99 |
| ASP.02 | Ongoing action versus completed event | 32 |
| ASP.03 | Past routine versus bounded occurrence or series | 22 |
| ASP.04 | State-verb meaning: continuing state versus change, attempt, or result | 17 |
| ASP.05 | Bounded episode, onset, or whole-event evaluation marked as ongoing | 13 |
| NONE | no code fits | 17 |

## Codes

### ASP.01: Background state or description marked as a bounded event

Use when a past state or description—such as location, identity, age, possession, appearance, feelings, knowledge, likes, weather, or a schedule in force at a reference time—provides background, but the learner uses the preterite. Use this code for a recurring state description too. Do not use for a dynamic action in progress (ASP.02), a routine action or series (ASP.03), or a clear bounded episode evaluation/onset (ASP.05). If both forms fit the context, abstain.

**Is this code:** La familia fue [era] muy rica. | La araña estuvo [estaba] en mi brazo. | Cuando tuvo [tenía] dieciséis años, pasaba el verano con mi abuelo. | La clase comenzó [comenzaba] a las diez y media. (The class was scheduled to start then.)

**Is not this code:** Ayer estuve en casa de Ana. (A bounded visit, not a background state.) | Instantáneamente me sentía [sentí] inseguro. (A feeling’s onset in a bounded episode; ASP.05.) | Cuando éramos niñas siempre hicimos [hacíamos] todo juntas. (A routine; ASP.03.)

**Probe:** Choose between a background state and a bounded episode: «Cuando llegamos, la puerta ___ abierta» vs «Ayer ___ en casa de Ana durante una hora».

**Practice:** `background_state_vs_bounded_event`

Sample errors given this code:
  - un programa fue para un festival internacional de cine en Europa. Nunca pensé que podría ir, simplemente, me impresionó que la universidad ofreciera un programa tan increíble. *(fue -> era)* — Background description of the program.
  - Después de dos años, el grupo comenzaba a tener éxito. Muchas chicas les gustaba la banda porque pensaron que eran muy guapos. *(pensaron -> pensaban)* — Ongoing belief about the band.
  - Tiene cincuenta y cuatro años. Era de Washington D.C. Su familia fue muy rica. *(fue -> era)* — Family wealth is a state.

### ASP.02: Ongoing action versus completed event

Use when a dynamic action is presented as in progress or as background at a reference time but is marked with the preterite, or when a clearly bounded, completed action is marked with the imperfect. The context must establish the action’s temporal framing. Do not use for stative predicates (ASP.01 or ASP.05), customary routines (ASP.03), or state verbs with a distinct aspectual meaning (ASP.04). A duration phrase alone does not establish this contrast.

**Is this code:** Cuando llegaba [llegué] a mi casa, mi abuela estaba enojada. (A single arrival.) | Luego, hacía [hice] las galletas con chispas de chocolate. | Los bomberos llegaron y apagaban [apagaron] el fuego. | Cuando la familia dormieron [dormía], Craig abrió la puerta.

**Is not this code:** Mientras caminaba, sonó el teléfono. (Ongoing background plus a completed event: both forms fit.) | Todos los días perseguía al mapache. (A routine, not one unfolding action; ASP.03.)

**Probe:** Contrast an action in progress with a bounded event: «Mientras ___ (cocinar), sonó la alarma» vs «De repente, ___ (cocinar) las galletas y las sirvió».

**Practice:** `ongoing_action_vs_completed_event`

Sample errors given this code:
  - El clima hacía calor y yo era muy cansada. Cuando yo llegaba a mi casa, mi abuela estaba muy enojado. *(llegaba -> llegué)* — Single arrival is completed.
  - La ultima razon porque ella es muy influyente y especial en mi vida es porque ella me ayudo a descubrir mi pasion de la literatura. Cuando yo tenia diez y seis anos pasaba el verano con mi abuelo. *(pasaba -> pasé)* — One summer spent with grandfather.
  - No me gusta Kylie Jenner. Porque ella crecía rica ella es muy descortés y tiene una personalidad mimada. *(crecía -> creció)* — Growing up rich is presented as a completed life period.

### ASP.03: Past routine versus bounded occurrence or series

Use when context clearly presents a customary, habitual, or regularly repeated past activity, but the learner frames it as a bounded occurrence or completed series, or when a clearly bounded occurrence/series is framed as a routine. The contrast can apply to action predicates and to recurring situations such as meals or activities. Do not infer habituality from a frequency word alone; a repeated set can be presented as completed. Do not use for a single action in progress (ASP.02).

**Is this code:** Cuando éramos niñas siempre hicimos [hacíamos] todo juntas. | En verano iban a la playa; se divirtieron [divertían] mucho juntos. | Cuando era niña, jugó [jugaba] al hockey sobre hierba. | Durante la escuela secundaria, corrí [corría] mucho todos los días.

**Is not this code:** Fui tres veces al cine la semana pasada. (A bounded, counted set of completed visits.) | Ayer cuidé a los peces por una hora. (One bounded occasion, not a routine.)

**Probe:** Choose the reading in each half: «De niño, ___ (ir) a la playa con mis primos» vs «El verano pasado ___ (ir) a la playa tres veces».

**Practice:** `habitual_routine_vs_bounded_series`

Sample errors given this code:
  - >> Mi hermana y yo tuvimos mucho miedo, pero nosotros dormimos y nos acostamos en la mañana para visitar mi madre. Su ataque de corazón fue porque de estrés y ella no le cuidó a su misma. *(cuidó -> cuidaba)* — Not caring for herself is a recurring pattern.
  - Mi amigo se dio cuenta de eso y comenzó a encontrar algunos intereses comunes para hablarme como lo hicimos en nuestra escuela secundaria. Sin embargo, ambos nos dimos cuenta de que éramos diferentes. *(hicimos -> hacíamos)* — Repeated shared activity in school.
  - en verano iban a la playa, en invierno jugaban en la nieve. se divirtieron mucho juntos. *(divirtieron -> divertían)* — Seasonal activities and fun are habitual.

### ASP.04: State-verb meaning: continuing state versus change, attempt, or result

Use only when context fixes the meaning contrast for a verb whose aspect can change its reading: for example, saber (know vs find out), conocer (know vs meet), querer/no querer (want vs try/refuse), poder/no poder (ability vs manage/fail), tener (possession/state vs a bounded result such as giving birth), tener que (ongoing obligation vs a completed obligation carried out), or existential haber (background existence vs a bounded occurrence). Do not use just because one of these verbs appears: a single-occasion no pude can mean either inability or tried-and-failed. Do not use for necesitar or darse cuenta, or when the intended reading is not established.

**Is this code:** Sus padres no supieron [sabían] cómo ayudar a su hija. (The context presents lack of knowledge, not a failure to find out.) | Pedí ir a casa porque quise [quería] ir a casa y comer fresas. (Ongoing desire.) | Kylie tenía [tuvo] un bebé recientemente. (The bounded event of giving birth.) | Teníamos [tuvimos] que subir al metro para llegar al hotel. (The obligation was carried out.)

**Is not this code:** Por fin supe la respuesta. (A bounded discovery; the preterite is appropriate.) | Podía nadar cuando era niña. (Ongoing ability; no change-of-meaning error.) | No pude dormir esa noche. (Can mean that the attempt to sleep failed; do not automatically change it to podía.)

**Probe:** Choose the form that matches the stated meaning: «De niña ya ___ (saber) leer» (ongoing knowledge) vs «Ayer por fin ___ (saber) la verdad» (finding out).

**Practice:** `state_verb_meaning_contrasts`

Sample errors given this code:
  - Sus padres no supieron como ayudar a su hija. No tenían bastante dinero para cuidar a un perro. *(supieron -> sabían)* — Lack of knowledge, not a discovery event.
  - No pudimos pasar tanto tiempo con nuestros abuelos como antes. Entonces, durante los fines de semana, me quedaba con mis abuelos porque quería. *(pudimos -> podíamos)* — Ongoing ability, not a completed failure.
  - Ella no supo como cuidar a un perro y le dio pan y una galleta con canela. Max comió todo y entonces Maya le dió más y más. *(supo -> sabía)* — Lack of knowledge about dog care.

### ASP.05: Bounded episode, onset, or whole-event evaluation marked as ongoing

Use when context clearly presents a bounded episode, a feeling’s onset, or an evaluation of a completed event as a whole, but the learner uses the imperfect as though the state were merely ongoing background. Typical cases include a whole-event judgment, a bounded role or period, a pseudo-cleft identifying what happened, or an explicit onset such as «instantáneamente». Do not use for background scene descriptions (ASP.01), ordinary dynamic event sequencing (ASP.02), or cases where the only evidence is a duration phrase and either aspect is plausible.

**Is this code:** Ayer era [fue] tu día final. | Instantáneamente, me sentía [sentí] inseguro. | El verano pasado era [fue] muy largo. | No era [fue] una persona, sino un pollo.

**Is not this code:** Cuando llegamos, el jardín era grande. (A background description; ASP.01.) | Cuando Maya miró el té, se dio cuenta de que era sangre. (Background identification, not a whole-event evaluation.) | Fue presidente durante ocho años. / Era presidente durante ocho años. (A duration phrase alone does not force one framing.)

**Probe:** Contrast whole-event evaluation with scene description: «¿Qué tal la fiesta? —___ increíble» vs «Cuando llegué, la casa ___ llena de gente».

**Practice:** `bounded_episode_vs_scene_description`

Sample errors given this code:
  - Ayer era tu día final. Entonces, adios.- Después de la llamada, Thomas se empezó a reírse. *(era -> fue)* — Identifies a bounded final day.
  - Él no dejó trabajando hasta tenía ochenta años, porque él siempre ponía su familia antes de él. Nunca conocí una persona más simpático y desinteresado que él. *(tenía -> tuvo)* — Age endpoint bounds the working period.
  - La gente le escuchó al aviso de Michelle como comer más bien para improvar la salud. En total, Señor Obama hacía bien durante el tiempo como Presidente. *(hacía -> hizo)* — Evaluation of a completed presidential period.

## No code (NONE)

  - Allí nos quedamos stargazing y era muy romántico. Desde ese momento sabía que él iba ser alguien diferente de los demás. *(era -> fue)* — Both event evaluation framings are plausible.
  - Caminó por todo el rio y les preguntó a todos si faltaban un perro. Nadie faltaron un perro. *(faltaron -> faltaba)* — Likely argument/agreement issue, not aspect.
  - Los científicos estaban confundidos porque ellos nunca hubieron visto a los animales que no podían nadar. “¡Tal vez podamos comerlos! Debemos venderlos a los restaurantes. *(hubieron -> habían)* — Auxiliary form in pluperfect, not this contrast.
  - Le dijo que haría todos mis quehaceres y también los de mi hermano el próximo día si ella me lo compró. Mi madre pensó sobre esta opción y finalmente decidió a aceptar los condiciones. *(compró -> compraba)* — Conditional/subjunctive context; target is questionable.
  - Ella llorando porque no estaban juntos y no hablaron lo vio la clave en la tienda de cómics y más tristeza le dio. Después de dos años regreso. *(hablaron -> hablaban)* — Narrative meaning and intended aspect unclear.
  - La tercera razon es porque mi abuela era una maestra por muchos anos. En el futuro espero que sea una maestra en la escuela secundaria. *(era -> fue)* — Duration alone does not require preterite.
  - Porque tuvieron que trabajar. Pero puedo divertirme solo. *(tuvieron -> tenían)* — Fragment lacks context to fix obligation framing.
  - Este lo motivó para trabajar más. Éste es el razón porque él era el Presidente para 8 años. *(era -> fue)* — Duration alone leaves the framing open.
  - Todo el mundo les encantó como pareja. Ha hecho cuatro álbumes y ha estado en gira muchas veces. *(encantó -> encantaban)* — Instructor target conflicts with agreement.
  - Este dia, 9 de diciembre 2013, mi madre murio. Para mucho tiempo, estaba lamentada. *(estaba -> estuve)* — Unidiomatic wording makes intended aspect unclear.
  - Cuando llegaron a su hotel, se sorprendieron con toda la vida salvaje que vieron. La biodiversidad fue asombrosa. *(fue -> era)* — Evaluation can naturally take either framing.
  - Pensé sobre que pude pintar. Solo hace un minuto que decidí a pintar unas nubes en el lienzo. *(pude -> podía)* — Could mean ability or a completed success.

## Left out

No code is assigned for presumed English transfer, narrative flattening, temporal-marker overuse, or other patterns that require a learner’s history. The sample also includes corrections that are preferences or do not establish one intended framing: for example, some single-occasion poder forms, evaluations that can be framed either way, duration-only states, and unclear narrative fragments. Auxiliary/pluperfect forms, agreement or argument-structure issues, and other non-aspect corrections are also left out. As the review recommends, multi-correction responses should be split into separate training items where possible; the assignments here identify the aspect contrast for the indexed correction, and do not infer a learner-level pattern from repeated or duplicated examples.
