/**
 * 扫尾拍打 / tailslap —— 出手方式。
 *
 * 核心念头：**原地整圈旋尾**——施法者以自己为轴快速旋转，坚硬的尾巴每一圈扫过身体周围整整一圈；转几圈由尾巴
 *   的分量决定，尾越沉甩得越多圈。它是本族唯一打一整圈、同时招呼周围所有人的招：被打中的沿背离方向推开，
 *   站得越近越难躲。旋转是连续的，所以某一圈没拍实也不会停手。
 *
 * 幕：
 *   起（coil，提交前）：压低重心、把尾巴绷直，脚边扬起一圈预备的尘；`action.present`，可打断、不花 PP。
 *   转（lap，提交后）：`laps` 圈。每一圈以施法者为心、`radius` 为半径扫一整圈（砸尾式收成前向 `arc` 一段），
 *       圈内所有非友方各吃一记 `lash` 接触伤害，随后被沿背离方向推开 `push` 格、挑起 `lift` 格；
 *       每圈独立掷 `accuracy`，没拍实的圈不伤人但继续转。
 *   收（settle）：转停、落回站姿，余尘落定。
 *
 * 与同族分开：乱抓会绕圈换位、乱击是站定定点突刺、骨棒乱打是掷骨夯地；只有扫尾以自身为轴，一次照顾四周，
 *   反制方式是趁起手退到 `radius` 之外，或干脆分散站位让它打不全。
 *
 * 配置 `smash`（砸尾式）由 resolve 改时序、由公式改威力／上挑／张角与推开；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 水平单位朝向：优先朝目标，没有目标时用当前朝向；接近竖直时退化为世界 Z 轴。 */
    function tailslapHeading(origin: CombatPoint, target: CombatPoint | null, fallback: CombatPoint): CombatPoint {
        const onward = target === null ? WorldCombat.point(0, 0, 0) : WorldCombat.point(target.x() - origin.x(), 0, target.z() - origin.z());
        if (onward.length() > 0.05) return onward.unit();
        const flat = WorldCombat.point(fallback.x(), 0, fallback.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        id: tailslapId,
        name: "Tail Slap",
        description: "The user attacks by striking the target with its hard tail. This move hits two to five times in a row.",
        uses: ["原地旋转，尾巴一圈圈扫过四周所有人", "被围住时一次照顾一整片", "砸尾式只扫前向一面，把伤害集中并挑起来"],
        kind: "enemy",
        range: 3.0,
        maxRange: 4.6,
        prepare: 7,
        active: 0,
        recover: 8,
        cooldown: 26,
        maximumTicks: 220,
        style: "spin",
        defaults: { smash: false, ai: { maxChase: 7, crowd: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[tailslapId], detail: { values: config } };
            return { radius: p(tailslapId, "radius", context), geometry: config && config.smash === true ? "cone" : "area",
                style: "spin", color: 0xC8B48E, label: config && config.smash === true ? "扫尾·砸尾式" : "扫尾·旋扫式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[tailslapId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(tailslapId, "tempo", context)),
                recover: Math.round(p(tailslapId, "settle", context)),
                cooldown: Math.round(p(tailslapId, "recharge", context)),
                active: 0,
                range: p(tailslapId, "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            const laps = Math.max(2, Math.min(5, Math.round(p(tailslapId, "laps", action))));
            const dust = Math.max(8, Math.round(p(tailslapId, "dust", action)));
            action.present("tailslap:coil:" + action.id(), tailslapScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", laps: laps, dust: dust, windup: prepare,
                    smash: config && config.smash === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const targetRef = target !== null && world.valid(target) ? String(target.ref()) : "";
            const power = p(tailslapId, "lash", action);
            const laps = Math.max(2, Math.min(5, Math.round(p(tailslapId, "laps", action))));
            const gap = Math.max(2, Math.round(p(tailslapId, "gap", action)));
            const radius = p(tailslapId, "radius", action);
            const push = p(tailslapId, "push", action);
            const arc = p(tailslapId, "arc", action);
            const lift = p(tailslapId, "lift", action);
            const accuracy = Math.max(0.05, Math.min(0.99, p(tailslapId, "accuracy", action)));
            const dust = Math.max(8, Math.round(p(tailslapId, "dust", action)));
            const smash = !!(config && config.smash === true);
            const band = { below: 1.2, above: 2.2 };
            const scale = Math.max(0.6, Math.min(1.8, radius / 3.0));
            const intensity = Math.max(0.5, Math.min(2.2, power / 30));
            let run = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function settle(current: CombatAction): void {
                const scope = current.world();
                const self = scope.observe(actor);
                const at = self !== null ? self.position() : current.origin();
                WorldFeedback.emit(scope, tailslapScene, 1, at,
                    { moment: "settle", laps: laps, run: run, landed: landed, dust: dust, scale: scale }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)), tailslapTallyText, [run, landed], 24);
                finish(current);
            }

            function lastSeen(): CombatPoint | null {
                if (targetRef === "") return null;
                const victim = world.actor(targetRef);
                const body = victim !== null && world.valid(victim) ? world.observe(victim) : null;
                return body !== null ? body.position() : null;
            }

            function lap(current: CombatAction): void {
                if (settled) return;
                if (run >= laps) { settle(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const origin = self.position();
                const heading = tailslapHeading(origin, lastSeen(), current.direction());
                const index = run + 1;
                WorldFeedback.emit(scope, tailslapScene, 1, origin,
                    { moment: smash ? "smash" : "lap", index: index, laps: laps, radius: radius, arc: arc, dust: dust,
                        direction: [heading.x(), heading.y(), heading.z()], smash: smash ? 1 : 0,
                        intensity: intensity }, 20);
                sound(current, "minecraft:entity.player.attack.sweep");
                if (scope.random() <= accuracy) {
                    const region = smash
                        ? WorldGeometry.sector(origin, heading, radius, arc, band)
                        : WorldGeometry.ring(origin, 0, radius, band);
                    WorldGeometry.selectEnemies(scope, region, function (other, facts) {
                        if (!hurt(current, other, tailslapId, power, { damage: damageSpec(tailslapId, "lash"), contact: true })) return;
                        landed++;
                        const at = facts.position();
                        let outward = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
                        outward = outward.length() < 0.05 ? heading : outward.unit();
                        if (scope.valid(other)) {
                            scope.displace(other, outward.scale(push));
                            if (lift > 0.02) scope.displace(other, WorldCombat.point(0, lift, 0));
                        }
                        WorldFeedback.emit(scope, tailslapScene, 1, at,
                            { moment: "hit", target: String(other.ref()), index: index, laps: laps, dust: dust,
                                push: Math.round(push * 100) / 100, scale: scale, intensity: intensity }, 20);
                        scope.sound("cobblemon:impact.normal", at, 14, "{}");
                    });
                }
                run = index;
                if (run >= laps) { settle(current); return; }
                current.after(gap, lap);
            }

            sound(action, "cobblemon:move.quickattack.actor");
            lap(action);
        }
    });
}
