/**
 * 雷电拳 / thunderpunch 的出手方式。
 *
 * 核心念头：**一记快拳把电流送进目标，贴住片刻才把电送进周围的人**——拳只是引线，有形状的是那道短粗电索。
 * 它是本族唯一的**链式**招：单点爆发不高，却一次点亮多个目标；主目标被电麻，被链到的目标也会麻。
 *
 * 判定用 `action.trace`（拳面 → 沿瞄准方向 `reach`），墙会挡下这一拳；命中后主击先结原 volt 的 70%。
 * 随后进入 `contact` 刻的放电窗：电索两端都用实体引用跟随双方实际位置，只有双方仍在拳程且通视时，
 * 才结余下的 30% 并从**真实目标**向 `chainRange` 内最近的至多 `arcs` 个其他敌人各跳一道电弧。
 * 退开、离场或被打断立即断电，没有后续链；超载不绕过 Boss 位移免疫，也不定住任何一方。
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
        description: "一记带着电流的快拳沿瞄准方向命中第一个目标，先结主拳的大部分伤害；随后贴住片刻，只有双方仍在拳程且互相看得见时才补上余下伤害，并从目标身上把电流链到旁边最近的敌人。被电中的目标都可能陷入麻痹；对方及时退开就只剩先拳、没有链电。",
        uses: ["贴身快拳起手", "让电流再链到旁边的第二个敌人", "快速给多个目标挂上麻痹"],
        kind: "aim",
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
                JSON.stringify({ moment: "charge" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scene = WorldFeedback.actionScenes(thunderpunchScene);
            const actor = action.actor();
            const reach = Math.max(1.6, action.range());
            const power = p("thunderpunch", "volt", action);
            const sparkPower = p("thunderpunch", "spark", action);
            const chainRange = p("thunderpunch", "chainRange", action);
            const maxArcs = Math.max(1, Math.round(p("thunderpunch", "arcs", action)));
            const numbChance = Math.max(0.02, Math.min(0.9, p("thunderpunch", "numbChance", action)));
            const arcChance = Math.max(0.02, Math.min(0.9, p("thunderpunch", "arcChance", action)));
            const radius = p("thunderpunch", "collisionRadius", action);
            const bolts = Math.max(3, Math.round(p("thunderpunch", "bolts", action)));
            const windowTicks = Math.max(3, Math.round(p("thunderpunch", "contact", action)));
            const jab = Math.max(1, Math.round(p("thunderpunch", "jab", action)));
            const intensity = Math.max(0.6, Math.min(2.4, power / 75));
            let settled = false, phase = 0;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scene.finish(current, done); } }

            function whiff(current: CombatAction): void {
                const scope = current.world(), me = scope.observe(current.actor());
                if (me !== null) {
                    WorldFeedback.emit(scope, thunderpunchScene, 1, me.position(), { moment: "whiff", intensity: intensity }, 18);
                    WorldFeedback.text(scope, me.position().plus(WorldCombat.point(0, 1.2, 0)), thunderpunchMissText, [], 20);
                }
                finish(current);
            }

            /** 电流从成功放电的真实目标向现预算内最近的邻敌各跳一道；保持原 spark 伤害与麻痹概率。 */
            function chain(current: CombatAction, from: CombatPoint, sourceRef: string): void {
                const scope = current.world();
                const candidates = scope.query(from, chainRange, false);
                let arcs = 0;
                for (let i = 0; i < candidates.length && arcs < maxArcs; i++) {
                    const other = candidates[i];
                    if (String(other.ref()) === sourceRef || scope.friendly(other)) continue;
                    const body = scope.observe(other);
                    if (body === null || !scope.clear(from, body.position())) continue;
                    const point = body.position();
                    WorldFeedback.emit(scope, thunderpunchScene, 1, point,
                        { moment: "arc", target: String(other.ref()), bolts: bolts, intensity: intensity,
                            path: [[from.x(), from.y(), from.z()], [point.x(), point.y(), point.z()]] }, 16);
                    if (hurt(current, other, "thunderpunch", sparkPower,
                        { damage: damageSpec("thunderpunch", "spark"), status: "paralysis", chance: arcChance }))
                        sound(current, "cobblemon:impact.electric");
                    arcs++;
                }
                finish(current);
            }

            /** 放电窗走完：补上余下 30%，并从真实目标起链。 */
            function discharge(current: CombatAction, struck: CombatActor): void {
                const scope = current.world();
                const victimBody = scope.valid(struck) ? scope.observe(struck) : null;
                if (victimBody === null) { finish(current); return; }
                const point = victimBody.position();
                hurt(current, struck, "thunderpunch", power * 0.3,
                    { damage: damageSpec("thunderpunch", "volt"), contact: true, punch: true });
                scene.show(current, "discharge", point,
                    { moment: "discharge", target: String(struck.ref()), bolts: bolts, intensity: intensity });
                scene.stop(current, "contact");
                sound(current, "cobblemon:impact.electric");
                chain(current, point, String(struck.ref()));
            }

            /** contact 刻的放电窗：电索两端跟随双方实际位置，退开或失去通视立即断电。 */
            function track(current: CombatAction, struck: CombatActor): void {
                const scope = current.world();
                const me = scope.observe(current.actor());
                const victimBody = scope.valid(struck) ? scope.observe(struck) : null;
                if (me === null || victimBody === null) {
                    scene.stop(current, "contact");
                    finish(current);
                    return;
                }
                const here = me.position(), there = victimBody.position();
                const keeps = there.minus(here).length() <= reach + 0.35 && scope.clear(here, there);
                if (!keeps) {
                    scene.show(current, "contact", there, { moment: "break", target: String(struck.ref()), intensity: intensity });
                    scene.stop(current, "contact");
                    finish(current);
                    return;
                }
                scene.show(current, "contact", there,
                    { moment: "contact", target: String(struck.ref()), path: ["source", "target"],
                        bolts: bolts, intensity: intensity, progress: Math.min(1, phase / windowTicks) });
                phase++;
                if (phase >= windowTicks) { discharge(current, struck); return; }
                current.after(1, function (later: CombatAction) { track(later, struck); });
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
                sound(current, "minecraft:item.trident.thunder");
                WorldFeedback.emit(scope, thunderpunchScene, 1, point,
                    { moment: "hit", target: String(struck.ref()), bolts: bolts, intensity: intensity }, 20);
                const landed = impact(current, contact, "thunderpunch", power * 0.7,
                    { damage: damageSpec("thunderpunch", "volt"), contact: true, punch: true, status: "paralysis", chance: numbChance });
                if (!landed) { whiff(current); return; }
                WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), thunderpunchHitText, [], 22);
                sound(current, "cobblemon:impact.electric");
                track(current, struck);
            }

            if (jab > 0) action.after(jab, function (later: CombatAction) { strike(later); });
            else strike(action);
        }
    });
}
