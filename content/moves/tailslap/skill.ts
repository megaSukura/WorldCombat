/**
 * 扫尾拍打 / tailslap —— 出手方式。
 *
 * 核心念头：**原地整圈旋尾**——施法者以自己为轴快速旋转，坚硬的尾巴每一圈扫过身体周围整整一圈；转几圈由尾巴
 *   的分量决定，尾越沉甩得越多圈。它是本族唯一打一整圈、同时招呼周围所有人的招：被打中的沿背离方向推开，
 *   站得越近越难躲。旋转是连续的，所以某一圈没拍实也不会停手。
 *
 * 选取 `kind: "aim"`：可以点任意阵营实体，也可以只给一个方向或世界点；不打方向时以自身为心转整圈。
 *   整圈分四段依次扫过（不是一次圆爆），同一个敌人在一圈里只吃一次；空圈也照常转完。控免 Boss 只吃伤害，
 *   实际顶不起来就不假装挑起。
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

    /** 把水平朝向绕 Y 轴转 `degrees` 度；整圈分四段依次扫过时用它给每段定方向。 */
    function tailslapTurn(heading: CombatPoint, degrees: number): CombatPoint {
        const radians = degrees * Math.PI / 180, cosine = Math.cos(radians), sine = Math.sin(radians);
        return WorldCombat.point(heading.x() * cosine - heading.z() * sine, 0, heading.x() * sine + heading.z() * cosine);
    }

    define({
        id: tailslapId,
        cooldownParameter: "recharge",
        name: "Tail Slap",
        description: "原地旋身，坚硬的尾巴一圈圈扫过身体周围：整圈分四段依次转过，每个敌人每圈各吃一下，并被沿背离方向推开。可以点敌人，也可以只给一个方向或干脆原地转整圈。旋扫式是整圈 360°、一次照顾四周；砸尾式收成前向一段、单圈更重并把人挑起。",
        uses: ["原地旋转，尾巴一圈圈扫过四周所有人", "被围住时一次照顾一整片", "砸尾式只扫前向一面，把伤害集中并挑起来", "不点目标也能以自身为心转完整圈"],
        kind: "aim",
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
            // 旋转是一段持续过程：用 actionScenes 保持到收势；整圈拆成四段依次扫过，不是一次圆爆。
            const scenes = WorldFeedback.actionScenes(tailslapScene);
            const segmentTicks = 1;
            let run = 0, landed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

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

            function lap(current: CombatAction, segment: number, hits: { [ref: string]: boolean }, accurate: boolean): void {
                if (settled) return;
                if (run >= laps) { settle(current); return; }
                const scope = current.world();
                const self = scope.observe(actor);
                if (self === null) { finish(current); return; }
                const origin = self.position();
                const heading = tailslapHeading(origin, lastSeen(), current.direction());
                const index = run + 1;
                // 整圈：四段各转 90°；砸尾式只扫前向一段（arc），不分段。
                const segmentDir = smash ? heading : tailslapTurn(heading, segment * 90);
                const width = smash ? arc : 90;
                if (segment === 0) {
                    accurate = scope.random() <= accuracy;
                    sound(current, "minecraft:entity.player.attack.sweep");
                }
                scenes.show(current, "lap" + index, origin,
                    { moment: smash ? "smash" : "lap", index: index, laps: laps, radius: radius, arc: width, dust: dust,
                        direction: [segmentDir.x(), segmentDir.y(), segmentDir.z()],
                        smash: smash ? 1 : 0, intensity: intensity });
                if (accurate) {
                    WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, segmentDir, radius, width, band), function (other, facts) {
                        const ref = String(other.ref());
                        if (hits[ref]) return;
                        if (!hurt(current, other, tailslapId, power, { damage: damageSpec(tailslapId, "lash"), contact: true })) return;
                        hits[ref] = true;
                        landed++;
                        const at = facts.position();
                        let outward = WorldCombat.point(at.x() - origin.x(), 0, at.z() - origin.z());
                        outward = outward.length() < 0.05 ? segmentDir : outward.unit();
                        // 实际位移才算数：控免 Boss 顶不动就只有伤害、不假装挑起。
                        let lifted = false;
                        if (scope.valid(other)) {
                            scope.displace(other, outward.scale(push));
                            if (lift > 0.02) lifted = scope.displace(other, WorldCombat.point(0, lift, 0)) > 0.02;
                        }
                        WorldFeedback.emit(scope, tailslapScene, 1, at,
                            { moment: "hit", target: ref, index: index, laps: laps, dust: dust,
                                push: Math.round(push * 100) / 100, scale: scale, intensity: intensity }, 20);
                        if (lifted)
                            WorldFeedback.emit(scope, tailslapScene, 1, at,
                                { moment: "launch", target: ref, index: index, lift: Math.round(lift * 100) / 100, scale: scale }, 20);
                        scope.sound("cobblemon:impact.normal", at, 14, "{}");
                    });
                }
                // 整圈分四段依次扫；空圈也照常转完。单敌每圈只结算一次。
                if (!smash && segment < 3) {
                    current.after(segmentTicks, function (next: CombatAction) { lap(next, segment + 1, hits, accurate); });
                    return;
                }
                run = index;
                if (run >= laps) { settle(current); return; }
                current.after(gap, function (next: CombatAction) { lap(next, 0, {}, false); });
            }

            sound(action, "cobblemon:move.quickattack.actor");
            lap(action, 0, {}, false);
        }
    });
}
