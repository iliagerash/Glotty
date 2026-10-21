# Taxonomy v2 draft: Preterite vs imperfect (es.gram.aspect.pret_imp)

Drafted 2026-10-21 by openai:gpt-6-luna#medium with `npm run taxonomy:draft` from 200 real instructor-corrected errors (training pool). Not approved.

## Summary

Four response-level contrasts cover the clear, teachable errors: a continuing state or description framed as a bounded event (ASP.01); an ongoing action framed as completed or vice versa (ASP.02); a past routine framed as a bounded event or vice versa (ASP.03); and a state/change-of-state verb whose aspect changes its meaning (ASP.04). When a correction is debatable, context is insufficient, or an index mixes distinct contrasts, the assignment is NONE. Unlike v1, these codes describe the local meaning contrast supported by the response, not a presumed learner strategy, L1 transfer, or a global narrative pattern. Duration words and temporal markers are not treated as automatic aspect rules.

## Coverage of the sample

| Code | Name | Errors |
| --- | --- | --- |
| ASP.01 | Continuing state or description vs bounded event | 94 |
| ASP.02 | Ongoing action vs completed event | 38 |
| ASP.03 | Past routine vs bounded occurrence or series | 23 |
| ASP.04 | State meaning vs onset, result, or successful event | 17 |
| NONE | no code fits | 28 |

## Codes

### ASP.01: Continuing state or description vs bounded event

Use when the response clearly describes a past condition, location, identity, possession, evaluation, or other state holding over a reference period, but uses the preterite as though it were a bounded event—or uses the imperfect for a clearly bounded state episode. Do not use for ongoing action verbs (ASP.02), habitual repetition (ASP.03), or a state/change-of-state verb whose aspect specifically changes its lexical meaning (ASP.04). If both aspectual framings are plausible, abstain.

**Is this code:** La familia fue [era] muy rica. | La araña estuvo [estaba] en mi brazo. | El jardín fue [era] grande con muchas plantas. | Me sentía [sentí] inseguro en ese momento.

**Is not this code:** Ayer estuve en casa de Ana. (A bounded visit, not a continuing background state.) | Cuando era niña, ayudaba a mi madre. (A habitual action; ASP.03.)

**Probe:** Choose the form for a past description holding at a reference time, not a one-time change: «Cuando llegamos, la puerta ___ abierta».

**Practice:** `state_description_vs_bounded_episode`

Sample errors given this code:
  - Cuando ocupaba comunicarme con ella lo hacia a travez de una compañera que fue algo amable. Mi madre se dio cuenta que yo no estaba aprendiendo nada asi que fue a la dirección a solicitar que me cambiaran de maestra, y así fue. *(fue -> era)* — A lasting personal quality.
  - En Agosto del año pasado, mi familia pasó por un tiempo muy difícil económicamente. Mi padre tuvo la suerte de trabajar como conductor de entrega en una de las tiendas de comestibles más grandes de todo Estados Unidos. *(tuvo -> tenía)* — Past circumstance of having luck.
  - Aunque me dice que no fue el más inteligente en su escuela, fue capaz sacar buenas notas. Trabajo mucho y estudió un montón. *(fue -> era)* — Ability is described as a trait.

### ASP.02: Ongoing action vs completed event

Use when context presents an action as in progress or as background at a reference time, but the learner presents it as a completed event, or presents a clearly bounded, completed action as ongoing. Do not use for stable conditions or descriptions (ASP.01), customary repeated actions (ASP.03), or state/change-of-state verbs with a distinct lexical aspectual meaning (ASP.04). A mere duration phrase does not establish the contrast.

**Is this code:** Cuando llegaba [llegué] a mi casa, mi abuela estaba enojada. (In the supplied story, this is a single arrival.) | Un día, caminaba por un bosque y escuchaba [escuchó] un sonido. | Luego, hacía [hice] las galletas con chispas de chocolate. | Cuando llamaba [llamé] a mi madre, mi padre me encontró.

**Is not this code:** Mientras caminaba, sonó el teléfono. (The walk is ongoing background; the phone call is a completed event.) | Todos los días cuidaba a los peces. (A routine, not a single ongoing action; ASP.03.)

**Probe:** Contrast an action in progress with a bounded event: «Mientras ___ (cocinar), sonó la alarma».

**Practice:** `ongoing_action_event_boundaries`

Sample errors given this code:
  - El clima hacía calor y yo era muy cansada. Cuando yo llegaba a mi casa, mi abuela estaba muy enojado. *(llegaba -> llegué)* — Single arrival in the story.
  - Un día, caminaba por un bosque y escuchaba un sonido. Se dio la vuelta en silencio y escuchó. *(escuchaba -> escuchó)* — One sound is heard as a completed event.
  - Estoy estaba miedo, especialmente porque no hablé jabonosa ni chino. Cuando mi abuela y yo llegamos a el otro avión, mis padres y hermana estaban ahí. *(hablé -> hablaba)* — Language ability is background in the episode.

### ASP.03: Past routine vs bounded occurrence or series

Use when context clearly presents customary, habitual, or regularly repeated past activity, but the learner frames it as a bounded occurrence or completed series, or when a clearly bounded occurrence/series is framed as a routine. Do not use merely because a sentence contains a frequency word; a repeated set can be presented as completed. Do not use for a one-time ongoing action (ASP.02) or a state verb whose aspect changes meaning (ASP.04).

**Is this code:** Cuando era niña, mi mamá me ayudó [ayudaba] con mi tarea. | Los cuidé [cuidaba] todos los días. | Cuando éramos niñas siempre hicimos [hacíamos] todo juntas. | En verano iban a la playa y se divirtieron [divertían] mucho juntos.

**Is not this code:** Fui tres veces al cine la semana pasada. (A bounded, counted set of completed visits.) | Ayer cuidé a los peces por una hora. (A bounded occasion, not a customary routine.)

**Probe:** Decide whether the sentence describes a routine or a completed set: «En aquella época, todos los domingos ___ (visitar) a mis abuelos».

**Practice:** `habitual_vs_completed_series`

Sample errors given this code:
  - Tan pronto como me acerqué a la pecera, todos se precipitaron hacia mí. Una vez, rocié algunos gusanos de pescado en el acuario. *(acerqué -> acercaba; precipitaron -> precipitaban)* — Approach and fish response are repeated.
  - Fishy era como mi mejor amigo. Cuando hizo mi tarea, aquí estuvo nadando en su casita. *(hizo -> hacía; estuvo -> estaba)* — The actions describe a recurring routine.
  - A veces, trajo un conejo de juguete cuando llegó al hospital. Debido a la enfermedad, no podía comer ningún artículo de hielo, incluyendo helados en verano. *(trajo -> traía; llegó -> llegaba)* — Bringing the toy is customary.

### ASP.04: State meaning vs onset, result, or successful event

Use only when context clearly establishes the lexical contrast for a state/change-of-state verb—such as saber, conocer, querer, poder, necesitar, or darse cuenta—and the learner's aspect selects the other reading. Examples include continuing knowledge vs finding out, ongoing ability vs managing to do something, or continuing desire vs deciding/trying on a particular occasion. Do not infer a general learner rule from one error; do not use if the context does not establish the intended reading. For ordinary action verbs, use ASP.02 or ASP.03.

**Is this code:** No pude [podía] dormir. (In the supplied context, inability continued.) | Sus padres no supieron [sabían] cómo ayudar a su hija. | Pedí ir a casa porque quise [quería] ir a casa y comer fresas. | No me daba [di] cuenta de que estaba describiendo mi pasado.

**Is not this code:** Por fin supe la respuesta. (A bounded discovery; preterite is appropriate.) | Podía nadar cuando era niña. (Ongoing ability; imperfect is appropriate.)

**Probe:** Choose the form that means «finally found out»: «Ayer por fin ___ la verdad».

**Practice:** `state_verb_aspectual_meaning_pairs`

Sample errors given this code:
  - Admirado por su belleza no fue capaz de hablar en un primer momento. Perseguidos por las Fuerzas Armadas de su padre, el Emperador, por culpa de la relación con su nueva novia, ellos no podían casarse de inmediato. *(podían -> pudieron)* — Poder contrasts opportunity with achievement.
  - Cuando yo llegué a mi casa, yo me acosté pero yo no pude dormir. "No es posible! Es verdad! *(pude -> podía)* — Ongoing inability, not a failed attempt.
  - Cada persona quiere tener una relación perfecta y saludable pero basado en las experiencias de mis amigas y yo, creo que es muy raro para encontrar una relación como esta en estos tiempos difíciles. Nuestro relación empezó antes del pandemia afectó los estados unidos y estoy feliz que podía tener una persona para pasar tiempo con durante todo el tiempo. *(podía -> pude)* — Poder describes opportunity in context.

## No code (NONE)

  - Me dijeron que tuve que ir a la sala de emergencia pronto, ya que estaba en un estado de cetoacidosis. Mi familia estuvo horrorizada mientras me admitieron al hospital y tuve que quedarme allá por tres días. *(tuve -> tenía; estuvo -> estaba; admitieron -> admitían)* — Corrections mix obligation, state, and admission.
  - Muchos a sus profesores en escuela no pensaron que Chance puede hacer música bien, pero eso inspiró el más. El continuaba a producir más música, y en 2012, el apareció en un álbum de Childish Gambino, y cantaba en sus conciertos muchas veces. *(continuaba -> continuó; cantaba -> cantó)* — The two corrections imply different readings; singing correction is debatable.
  - Se fue en cada habitacion individual en la casa. Sin embargo, lo que no vio era su mascota favorita suerte. *(era -> fue)* — The intended clause and correction are unclear.
  - Caminó por todo el rio y les preguntó a todos si faltaban un perro. Nadie faltaron un perro. *(faltaron -> faltaba)* — Likely existential/agreement issue, not aspect.
  - Los científicos estaban confundidos porque ellos nunca hubieron visto a los animales que no podían nadar. “¡Tal vez podamos comerlos! Debemos venderlos a los restaurantes. *(hubieron -> habían)* — Auxiliary/tense correction is not a clear aspect contrast.
  - Ella no tenia idea de que era lo que queria estudiar para la universida. Por mucho tiempo ella estaba en debate entre la carrera de ciencia y una carrera de arte. *(estaba -> estuvo)* — Either framing of the period of indecision is plausible.
  - Sus padres son medicos y tuvieron que trabajar. En mi tiempo libre, hizo mi tarea y hizo cosas con mi familia, amigos, y novio. *(tuvieron -> tenían; hizo -> hacía)* — Corrections mix obligation with habitual activity.
  - Los días del verano eran muy tranquilos y los recuerdo con cariño. Una otra cosa que me hacía feliz fue la cantidad de tiempo libre que tenía. *(eran -> fueron; fue -> era)* — The two corrections use different framings; preference is possible.
  - Cuando fui a escuela primaria, Dibujaba todos los días en la clase de arte y me gustaba mucho, así que seguía despues mi clase de arte terminó. También, Me gusta tocar muchos instrumentos. *(fui -> iba; seguía -> seguí)* — Corrections mix childhood routine and a completed follow-up.
  - Le dijo que haría todos mis quehaceres y también los de mi hermano el próximo día si ella me lo compró. Mi madre pensó sobre esta opción y finalmente decidió a aceptar los condiciones. *(compró -> compraba)* — Conditional framing makes the correction uncertain.
  - Para mucho tiempo, estaba lamentada. Si yo puedo cambiar mi vida, no queria la cambiar. *(estaba -> estuve)* — The duration permits imperfect; correction is a preference.
  - Corré ¨Cross Country¨ y ¨Track and Field.¨ En mi tiempo libre, me gusta dibujar a veces. Cuando fui a escuela primaria, Dibujaba todos los días en la clase de arte y me gustaba mucho, así que seguía despues mi clase de arte terminó. *(fui -> iba; seguía -> seguí)* — Corrections mix habitual drawing and completed continuation.

## Left out

The corrections include many choices that cannot be established as errors from the supplied two sentences alone: descriptive states can sometimes be presented as bounded episodes, and duration or frequency phrases do not force a single aspect. Several entries also mix unrelated corrections, contain unclear wording, or appear to reflect instructor preference; these receive NONE rather than a forced code. I did not create codes for English transfer, narrative flattening, temporal-marker overgeneralization, verb-duration defaults, or patterns across a learner's history: these are learner-level hypotheses, not local meaning contrasts.
