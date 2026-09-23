/**
 * 火焰拳 / firepunch 的出手方式。
 *
 * 核心念头：**一记把火种按进目标的拳**——拳头本身不重，留下的是那点火：目标被点着后持续掉血、因灼伤而减攻；
 * 只要它真的烧起来，火就顺着舐到旁边最近的另一个敌人身上。它是本族唯一的**持续伤害**招，追求"打完还在烧"。
 *
 * 三幕：
 *   起（windup，提交前）：拳头缠上火焰、火星四散，只播预告。
 *   击（jab → hit）：提交后引火 `jab` 刻，朝目标冲拳；命中结算 blaze 接触+拳伤害，并按 scorchChance 点燃
 *       （共享身份 world_combat:status/burn；宝可梦同步为原生灼伤）。被点着的人身上会窜起短促明火。
 *   蔓（spread）：若目标确实烧了起来，从命中点朝 `spreadRange` 内最近的另一个敌人蔓延一次灼伤。
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
        description: "一记缠满火焰的拳按进目标：命中造成伤害，并有较高概率把目标点着（持续掉血、灼伤减攻）；只要目标真的烧起来，火就会顺势蔓延到旁边最近的另一个敌人身上。",
        uses: ["贴身点着目标，留下持续掉血", "借灼伤削弱对方的物攻", "让火焰蔓延到旁边的第二个敌人"],
        kind: "enemy",
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
                JSON.stringify({ moment: "charge", blazeUp: config && config.blazeUp === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const selected = action.target();
            const targetRef = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
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
            function victim(scope: CombatWorld): CombatActor | null { const value = targetRef === "" ? null : scope.actor(targetRef); return value !== null && scope.valid(value) ? value : null; }

            function whiff(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me !== null) {
                    WorldFeedback.emit(scope, firepunchScene, 1, me.position(), { moment: "whiff", embers: embers, intensity: intensity }, 18);
                    WorldFeedback.text(scope, me.position().plus(WorldCombat.point(0, 1.2, 0)), firepunchMissText, [], 20);
                }
                finish(current);
            }

            /** 火真的烧起来之后，顺势舐向命中点附近最近的另一个敌人一次。 */
            function spreadFire(current: CombatAction, from: CombatPoint, struckRef: string): void {
                const scope = current.world();
                const candidates = scope.query(from, spreadRange, false);
                for (let i = 0; i < candidates.length; i++) {
                    const other = candidates[i];
                    if (String(other.ref()) === struckRef || scope.friendly(other)) continue;
                    const body = scope.observe(other);
                    if (body === null || !scope.clear(from, body.position())) continue;
                    if (!CombatStatus.inflict(scope, other, "burn", spreadTicks, 0, { secondary: true })) return;
                    const point = body.position();
                    WorldFeedback.emit(scope, firepunchScene, 1, point,
                        { moment: "spread", target: String(other.ref()), embers: embers, intensity: intensity,
                            path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]] }, 20);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), firepunchSpreadText, [], 22);
                    return;
                }
            }

            function strike(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor()), aimAt = victim(scope);
                const body = aimAt !== null ? scope.observe(aimAt) : null;
                if (me === null || body === null) { whiff(current); return; }
                const dx = body.position().x() - me.position().x(), dz = body.position().z() - me.position().z();
                const distance = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
                const forward = WorldCombat.point(dx / distance, 0, dz / distance);
                const hit = current.trace(me.position(), me.position().plus(forward.scale(Math.min(4.2, distance + 0.7))), radius);
                if (!hit.hitEntity()) { whiff(current); return; }
                const struck = hit.target(), point = hit.position();
                sound(current, "minecraft:entity.blaze.shoot");
                WorldFeedback.emit(scope, firepunchScene, 1, point,
                    { moment: "hit", target: struck !== null ? String(struck.ref()) : "", embers: embers, intensity: intensity }, 22);
                const landed = impact(current, hit, "firepunch", power,
                    { damage: damageSpec("firepunch", "blaze"), contact: true, punch: true, status: "burn", chance: chance, statusTicks: scorch });
                if (!landed || struck === null || !scope.valid(struck)) { finish(current); return; }
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), firepunchHitText, [], 22);
                sound(current, "cobblemon:impact.fire");
                const struckRef = String(struck.ref());
                if (CombatStatus.has(scope, struck, "burn")) {
                    scope.ignite(struck, Math.max(20, Math.min(60, Math.round(scorch * 0.2))));
                    WorldFeedback.emit(scope, firepunchScene, 1, point,
                        { moment: "ignite", target: struckRef, embers: embers, intensity: intensity }, 22);
                    sound(current, "minecraft:entity.blaze.burn");
                    spreadFire(current, point, struckRef);
                }
                finish(current);
            }

            if (jab > 0) action.after(jab, function (later: CombatAction) { strike(later); });
            else strike(action);
        }
    });
}
