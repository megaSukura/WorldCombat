/**
 * 巴投 / circlethrow —— 注册与动作。
 *
 * 核心念头：贴身抓住一个对手，越肩把它摔到自己背后。抓取要求实际近距身体接触与通视；命中成功后才进入抛投，
 *   抛线每刻按目标实际当前位置短步推进，途中撞天花板／墙就地落下收束，不追赶越墙的计划点。落地只在原地做一次
 *   允许的动作打断，并尝试原生 partyForceOut；抗搬运者吃抓摔伤害但不播放越肩飞行。本招不再持续清目标。
 * 两幕：
 *   起（windup，提交前）：压低下盘、双手拢起抓握的褐光，预告这一次贴身。
 *   抓与摔（execute，提交后）：先判定抓取——目标在 grip 内、且到它的连线无遮挡才抓住，否则空手收回。
 *       抓住后先结算 slam，命中成功才把人沿一条越肩抛物线带过头顶，落到背离来向的一侧。每一拍用
 *       `hitDisplace` 按实际当前位置补一小步：撞墙／抗位移就就地落下，落点用实际身体位置；落地做一次打断与换人。
 * 反制：只对一个目标、必须贴身；对手在你出手瞬间横移出抓取距离就抓空；摔的飞行会被地形挡住。
 */
namespace PokemonSkills {
    define({
        id: circlethrowId,
        cooldownParameter: "recharge",
        name: "巴投",
        description: "贴身抓住一个对手，先吃一记格斗属性接触伤害，再把它越肩摔到自己背后：抛线沿实际位置逐刻推进，撞墙就地落下。落地做一次动作打断，有后备的对手被真正换下；抗搬运者只吃伤害、不被摔飞。可以朝空处伸手抓空。",
        uses: ["把一个扑上来的对手摔到背后", "贴身反击、把对手从自己面前清走", "把厚实目标摔出近身圈并打上一击"],
        kind: "aim",
        range: 2.8,
        maxRange: 3.8,
        prepare: 11,
        active: 1,
        recover: 9,
        cooldown: 100,
        style: "throw",
        defaults: { tight: false, ai: { maxChase: 7, leaveStation: false } },
        fields: [flag("tight", "贴身固投")],
        resolve: function (pokemon: CombatPokemon, config: any, world?: CombatWorld | null, actor?: CombatActor | null, attributes?: IndividualAttributes.Context) {
            const context: NumberContext = { pokemon, skill: skills[circlethrowId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return { prepare: Math.round(p(circlethrowId, "tempo", context)), recover: Math.round(p(circlethrowId, "aftercast", context)),
                cooldown: Math.round(p(circlethrowId, "recharge", context)), active: 1, range: p(circlethrowId, "grip", context) };
        },
        windup: function (action: CombatAction, config: any, prepare: number) {
            const body = action.sense().observe(action.actor());
            const scale = body ? (body.width() + body.height()) / 2.3 : 1;
            action.present("world_combat:move_circlethrow:windup", circlethrowScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", scale: scale, rings: Math.round(p(circlethrowId, "rings", action)) }));
            return prepare;
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: p(circlethrowId, "grip", pokemon), geometry: "line", style: "throw", color: 0xD89A6A,
                label: config && config.tight ? "巴投·贴身固投" : "巴投" };
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const world = action.world(), actor = action.actor();
            const selected = action.target();
            const grabbed: CombatActor | null = selected !== null && world.valid(selected) ? selected : null;
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const centre = self.position();
            const grip = p(circlethrowId, "grip", action), slam = p(circlethrowId, "slam", action);
            const fling = p(circlethrowId, "fling", action), arc = p(circlethrowId, "arc", action);
            const air = Math.max(2, Math.round(p(circlethrowId, "air", action)));
            const rings = Math.round(p(circlethrowId, "rings", action));
            const scale = (self.width() + self.height()) / 2.3;
            const scenes = WorldFeedback.actionScenes(circlethrowScene, 1);

            if (grabbed === null) {
                WorldFeedback.emit(world, circlethrowScene, 1, centre.plus(WorldCombat.point(0, 0.4, 0)), { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), circlethrowMissText, [], 24);
                done(action);
                return;
            }

            const victim = world.observe(grabbed);
            if (victim === null) { done(action); return; }
            const from = victim.position();
            const distance = from.minus(centre).length();
            // 抓取判定：实际近距身体接触 + 通视。够不到或被方块挡住就抓空。
            if (distance > grip + 0.35 || !world.clear(centre, from)) {
                WorldFeedback.emit(world, circlethrowScene, 1, from, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.2, 0)), circlethrowMissText, [], 24);
                done(action);
                return;
            }
            let heading = WorldCombat.point(from.x() - centre.x(), 0, from.z() - centre.z());
            if (heading.length() < 0.01) heading = WorldCombat.point(action.direction().x(), 0, action.direction().z());
            if (heading.length() < 0.01) heading = WorldCombat.point(0, 0, 1);
            heading = heading.unit();
            const over = WorldCombat.point(-heading.x(), 0, -heading.z());
            const ideal = WorldCombat.point(centre.x() + over.x() * fling, from.y(), centre.z() + over.z() * fling);
            action.face(from, 20, 20);

            // 抓住：贴身扣住，先结算摔击；命中成功才进入抛投。
            WorldFeedback.emit(world, circlethrowScene, 1, from, { moment: "grip", target: String(grabbed.ref()), rings: rings, scale: scale }, 20);
            world.sound("minecraft:entity.player.attack.strong", from, 16, "{}");
            const landed = hurt(action, grabbed, circlethrowId, slam, { damage: damageSpec(circlethrowId, "slam"), contact: true });
            if (!landed) {
                WorldFeedback.emit(world, circlethrowScene, 1, from, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, from.plus(WorldCombat.point(0, 1.2, 0)), circlethrowMissText, [], 24);
                done(action);
                return;
            }
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.5, 0)), circlethrowThrowText, [], 24);
            scenes.show(action, "throw", from, { moment: "throw", target: String(grabbed.ref()), rings: rings, scale: scale, phase: 0 });
            let step = 0, finished = false;

            function land(current: CombatAction, blocked: boolean): void {
                if (finished) return;
                finished = true;
                const scope = current.world(), after = scope.observe(grabbed!);
                scenes.stop(current, "throw");
                if (after !== null) {
                    const at = after.position();
                    WorldFeedback.emit(scope, circlethrowScene, 1, at,
                        { moment: blocked ? "bump" : "land", target: String(grabbed!.ref()), rings: rings, scale: scale }, 22);
                    scope.sound("minecraft:entity.player.attack.strong", at, 16, "{}");
                    scope.interrupt(grabbed!, "world_combat:circlethrow");
                    if (partyForceOut(scope, grabbed!, partyFeet(after)) !== null)
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), circlethrowSwitchText, [], 24);
                }
                scenes.finish(current, done);
            }

            function fly(current: CombatAction): void {
                const scope = current.world(), now = scope.observe(grabbed!);
                if (now === null) { land(current, false); return; }
                step++;
                const t = Math.min(1, step / air);
                const desired = from.plus(ideal.minus(from).scale(t)).plus(WorldCombat.point(0, arc * 4 * t * (1 - t), 0));
                const delta = desired.minus(now.position());
                const applied = scope.hitDisplace(grabbed!, delta);
                const blocked = applied < delta.length() - 0.05;
                const at = scope.observe(grabbed!);
                if (at !== null) scenes.show(current, "throw", at.position(),
                    { moment: "throw", target: String(grabbed!.ref()), rings: rings, scale: scale, phase: Math.round(t * 100) / 100 });
                if (blocked || step >= air) { land(current, blocked && step < air); return; }
                current.after(1, function (next: CombatAction) { fly(next); });
            }

            action.after(1, function (next: CombatAction) { fly(next); });
        }
    });
}
