/**
 * 火焰拳 / firepunch 的出手方式。
 *
 * 核心念头：**一记把火种按进目标的拳**——拳头本身不重，留下的是那点火：目标被点着后持续掉血、因灼伤而减攻；
 * 只要它真的烧起来，火就顺着舐到旁边最近的另一个敌人身上。它是本族唯一的**持续伤害**招，追求"打完还在烧"。
 *
 * 拳是**自由 3D 短拳**：从身体中心沿瞄准方向伸出 `fistReach`，由 `action.trace` 判首碰（墙与其他身体会挡住，
 * 也可空挥），不为选中的目标自动伸长。传火只从**真实烧起来的那个目标**起：候选按真实距离排序，逐个跳过
 * 已灼伤、免疫与遮挡者，最多成功点着一名——中间夹一个火免疫怪不会吃掉整次传火。
 *
 * 配置 `blazeUp`（烈焰式）由 resolve 改时序、由公式改威力／点燃／灼伤／蔓延，提交后才触碰世界。
 */
namespace PokemonSkills {
    const firepunchScene = "world_combat:move_firepunch";
    const firepunchHitText = "world_combat.move.firepunch.text.hit";
    const firepunchSpreadText = "world_combat.move.firepunch.text.spread";
    const firepunchMissText = "world_combat.move.firepunch.text.miss";

    define({
        id: "firepunch",
        cooldownParameter: "recharge",
        name: "Fire Punch",
        description: "一记缠满火焰的拳沿瞄准方向打出，命中第一个挡在拳程里的目标：造成伤害并有较高概率把它点着（持续掉血、灼伤减攻）；只要目标真的烧起来，火就顺势蔓延到旁边最近的、还没烧着且能被点着的另一个敌人。中间隔着火免疫或已灼伤的敌人也不会吃掉这次传火。",
        uses: ["贴身点着目标，留下持续掉血", "借灼伤削弱对方的物攻", "让火焰蔓延到旁边的第二个敌人"],
        kind: "aim",
        range: 2.5,
        maxRange: 3.4,
        prepare: 6,
        active: 16,
        recover: 6,
        cooldown: 24,
        style: "punch",
        defaults: { blazeUp: false, ai: { maxChase: 6, preferUnlit: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("firepunch", "fistReach", pokemon) + 0.3, geometry: "line", style: "fire", color: 0xE2531B,
                label: config && config.blazeUp === true ? "烈焰拳" : "火焰拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["firepunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("firepunch", "tempo", context)),
                recover: Math.round(p("firepunch", "aftercast", context)),
                cooldown: Math.round(p("firepunch", "recharge", context)),
                active: skills["firepunch"].active,
                range: p("firepunch", "fistReach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_firepunch:windup", firepunchScene, 1, action.origin(),
                JSON.stringify({ moment: "charge" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const actor = action.actor();
            const reach = p("firepunch", "fistReach", action);
            const power = p("firepunch", "blaze", action);
            const chance = Math.max(0.05, Math.min(0.95, p("firepunch", "scorchChance", action)));
            const scorch = Math.max(40, Math.round(p("firepunch", "scorchTicks", action)));
            const spreadRange = p("firepunch", "spreadRange", action);
            const spreadTicks = Math.max(40, Math.round(p("firepunch", "spreadTicks", action)));
            const radius = p("firepunch", "collisionRadius", action);
            const embers = Math.max(5, Math.round(p("firepunch", "embers", action)));
            const jab = Math.max(1, Math.round(p("firepunch", "jab", action)));
            const intensity = Math.max(0.6, Math.min(2.4, power / 75));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function whiff(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me !== null) {
                    WorldFeedback.emit(scope, firepunchScene, 1, me.position(), { moment: "whiff", intensity: intensity }, 18);
                    WorldFeedback.text(scope, me.position().plus(WorldCombat.point(0, 1.2, 0)), firepunchMissText, [], 20);
                }
                finish(current);
            }

            /** 火真的烧起来之后，从燃烧部位朝最近一个可点燃的邻敌飞一缕火花；已灼伤/免疫/遮挡者跳过。 */
            function spreadFire(current: CombatAction, burned: CombatActor, struckRef: string): void {
                const scope = current.world();
                const burnedBody = scope.observe(burned);
                if (burnedBody === null) return;
                const from = burnedBody.position();
                const candidates = scope.query(from, spreadRange, false).slice();
                candidates.sort(function (a, b) {
                    const fa = scope.observe(a), fb = scope.observe(b);
                    const da = fa === null ? Infinity : from.minus(fa.position()).length();
                    const db = fb === null ? Infinity : from.minus(fb.position()).length();
                    return da - db;
                });
                for (let i = 0; i < candidates.length; i++) {
                    const other = candidates[i];
                    if (String(other.ref()) === struckRef || scope.friendly(other)) continue;
                    const body = scope.observe(other);
                    if (body === null) continue;
                    if (CombatStatus.has(scope, other, "burn")) continue;
                    if (!scope.clear(from, body.position())) continue;
                    if (!CombatStatus.inflict(scope, other, "burn", spreadTicks, 0, { secondary: true })) continue;
                    const to = body.position();
                    const away = to.minus(from);
                    const span = away.length();
                    const direction = span > 0.001 ? away.unit() : WorldCombat.point(0, 1, 0);
                    WorldFeedback.emit(scope, firepunchScene, 1, from,
                        { moment: "spread", target: struckRef, direction: [direction.x(), direction.y(), direction.z()],
                            span: Math.max(0.3, span), embers: embers, intensity: intensity }, 20);
                    WorldFeedback.emit(scope, firepunchScene, 1, to,
                        { moment: "spread_hit", target: String(other.ref()), embers: embers, intensity: intensity }, 22);
                    WorldFeedback.text(scope, to.plus(WorldCombat.point(0, 1.2, 0)), firepunchSpreadText, [], 22);
                    return;
                }
            }

            function strike(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me === null) { whiff(current); return; }
                const direction = aim(current);
                const from = me.position(), to = from.plus(direction.scale(reach));
                const contact = current.trace(from, to, radius, true);
                if (!contact.hitEntity()) { whiff(current); return; }
                const struck = contact.target();
                if (struck === null || String(struck.ref()) === String(actor.ref()) || scope.friendly(struck)) { whiff(current); return; }
                const point = contact.position();
                sound(current, "minecraft:entity.blaze.shoot");
                WorldFeedback.emit(scope, firepunchScene, 1, point,
                    { moment: "hit", target: String(struck.ref()), embers: embers, intensity: intensity }, 22);
                const landed = impact(current, contact, "firepunch", power,
                    { damage: damageSpec("firepunch", "blaze"), contact: true, punch: true, status: "burn", chance: chance, statusTicks: scorch });
                if (!landed || !scope.valid(struck)) { finish(current); return; }
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), firepunchHitText, [], 22);
                sound(current, "cobblemon:impact.fire");
                if (CombatStatus.has(scope, struck, "burn")) {
                    scope.ignite(struck, Math.max(20, Math.min(60, Math.round(scorch * 0.2))));
                    WorldFeedback.emit(scope, firepunchScene, 1, point,
                        { moment: "ignite", target: String(struck.ref()), embers: embers, intensity: intensity }, 22);
                    sound(current, "minecraft:entity.blaze.burn");
                    spreadFire(current, struck, String(struck.ref()));
                }
                finish(current);
            }

            if (jab > 0) action.after(jab, function (later: CombatAction) { strike(later); });
            else strike(action);
        }
    });
}
