/**
 * 雷电拳 / thunderpunch 的出手方式。
 *
 * 核心念头：**一记快拳把电流送进目标，电流再从命中点贴着地面追到旁边最近的另一个敌人**——拳只是引线，
 * 有形状的是那道追出去的弧。它是本族唯一的**链式**招：单点爆发不高，却一次点亮多个目标；主目标被电麻，
 * 被链到的目标也会麻。判定用 `action.trace`（拳面 → 目标活体），墙会挡下这一拳与随后的电弧。
 *
 * 三幕：
 *   起（windup，提交前）：拳面窜起电光、脚底发亮，只播预告。
 *   击（jab → hit）：提交后引电 `jab` 刻，朝目标冲出拳面；命中结算 volt 接触+拳伤害并按 numbChance 麻痹。
 *   链（arc）：从命中点起，沿地面向 `chainRange` 内最近的至多 `arcs` 个其他敌人各跳一道电弧，
 *       各结算 spark 伤害并按 arcChance 麻痹；没有第二个目标时电弧就地熄灭。
 *
 * 配置 `overcharge`（超载式）由 resolve 改时序、由公式改威力／跳距／目标数，提交后才触碰世界。
 */
namespace PokemonSkills {
    const thunderpunchScene = "world_combat:move_thunderpunch";
    const thunderpunchHitText = "world_combat.move.thunderpunch.text.hit";
    const thunderpunchArcText = "world_combat.move.thunderpunch.text.arc";
    const thunderpunchMissText = "world_combat.move.thunderpunch.text.miss";

    define({
        id: "thunderpunch",
        cooldownParameter: "recharge",
        name: "Thunder Punch",
        description: "An electrified fist jabs the target; the current then runs along the ground to the nearest other foe, shocking both. Each struck target may be left paralyzed.",
        uses: ["贴身快拳起手", "让电流再链到旁边的第二个敌人", "快速给多个目标挂上麻痹"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.4,
        prepare: 5,
        active: 16,
        recover: 6,
        cooldown: 22,
        style: "punch",
        defaults: { overcharge: false, ai: { maxChase: 6, preferCrowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("thunderpunch", "chainRange", pokemon), geometry: "line", style: "electric", color: 0xE8D24A,
                label: config && config.overcharge === true ? "超载雷电拳" : "雷电拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["thunderpunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("thunderpunch", "tempo", context)),
                recover: Math.round(p("thunderpunch", "aftercast", context)),
                cooldown: Math.round(p("thunderpunch", "recharge", context)),
                active: skills["thunderpunch"].active,
                range: skills["thunderpunch"].range
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_thunderpunch:windup", thunderpunchScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", overcharge: config && config.overcharge === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const selected = action.target();
            const targetRef = selected !== null && world.valid(selected) ? String(selected.ref()) : "";
            const power = p("thunderpunch", "volt", action);
            const sparkPower = p("thunderpunch", "spark", action);
            const chainRange = p("thunderpunch", "chainRange", action);
            const maxArcs = Math.max(1, Math.round(p("thunderpunch", "arcs", action)));
            const numbChance = Math.max(0.02, Math.min(0.9, p("thunderpunch", "numbChance", action)));
            const arcChance = Math.max(0.02, Math.min(0.9, p("thunderpunch", "arcChance", action)));
            const radius = p("thunderpunch", "collisionRadius", action);
            const bolts = Math.max(3, Math.round(p("thunderpunch", "bolts", action)));
            const jab = Math.max(1, Math.round(p("thunderpunch", "jab", action)));
            const intensity = Math.max(0.6, Math.min(2.4, power / 75));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            function victim(scope: CombatWorld): CombatActor | null { const value = targetRef === "" ? null : scope.actor(targetRef); return value !== null && scope.valid(value) ? value : null; }

            function whiff(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me !== null) {
                    WorldFeedback.emit(scope, thunderpunchScene, 1, me.position(), { moment: "whiff", bolts: bolts, intensity: intensity }, 18);
                    WorldFeedback.text(scope, me.position().plus(WorldCombat.point(0, 1.2, 0)), thunderpunchMissText, [], 20);
                }
                finish(current);
            }

            /** 电流从命中点追出去：沿地面依次跳向最近的其他非友方，各结一道 spark。 */
            function chain(current: CombatAction, from: CombatPoint, struckRef: string): void {
                const scope = current.world();
                const candidates = scope.query(from, chainRange, false);
                let arcs = 0;
                for (let i = 0; i < candidates.length && arcs < maxArcs; i++) {
                    const other = candidates[i];
                    if (String(other.ref()) === struckRef || scope.friendly(other)) continue;
                    const body = scope.observe(other);
                    if (body === null || !scope.clear(from, body.position())) continue;
                    const point = body.position();
                    WorldFeedback.emit(scope, thunderpunchScene, 1, point,
                        { moment: "arc", target: String(other.ref()), bolts: bolts, intensity: intensity,
                            path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]] }, 16);
                    const landed = hurt(current, other, "thunderpunch", sparkPower,
                        { damage: damageSpec("thunderpunch", "spark"), status: "paralysis", chance: arcChance });
                    if (landed) sound(current, "cobblemon:impact.electric");
                    arcs++;
                }
                finish(current);
            }

            function strike(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor()), aimAt = victim(scope);
                const body = aimAt !== null ? scope.observe(aimAt) : null;
                if (me === null || body === null) { whiff(current); return; }
                const dx = body.position().x() - me.position().x(), dz = body.position().z() - me.position().z();
                const distance = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
                const forward = WorldCombat.point(dx / distance, 0, dz / distance);
                const hit = current.trace(me.position(), me.position().plus(forward.scale(Math.min(4.5, distance + 0.8))), radius);
                if (!hit.hitEntity()) { whiff(current); return; }
                const struck = hit.target(), point = hit.position();
                sound(current, "minecraft:item.trident.thunder");
                WorldFeedback.emit(scope, thunderpunchScene, 1, point,
                    { moment: "hit", target: struck !== null ? String(struck.ref()) : "", bolts: bolts, intensity: intensity }, 20);
                const landed = impact(current, hit, "thunderpunch", power,
                    { damage: damageSpec("thunderpunch", "volt"), contact: true, punch: true, status: "paralysis", chance: numbChance });
                if (landed) {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), thunderpunchHitText, [], 22);
                    sound(current, "cobblemon:impact.electric");
                }
                chain(current, point, struck !== null ? String(struck.ref()) : "");
            }

            if (jab > 0) action.after(jab, function (later: CombatAction) { strike(later); });
            else strike(action);
        }
    });
}
