/**
 * 巴投 / circlethrow —— 注册与动作。
 *
 * 核心念头：贴身抓住一个对手，越肩把它摔到自己背后。抓取不靠预选，而是沿瞄准方向做一次真实身体／方块
 *   trace：撞到的第一个可抓活体就是受体，被墙或空处挡住就抓空。命中成功后才进入抛投，抛线每刻按目标实际
 *   当前位置短步推进，途中撞天花板／墙就在真碰处落下收束，不追赶越墙的计划点。
 *   完全抗搬（初推位移为 0）只吃抓摔伤害、不播越肩飞行、不打断也不强换；只有真的被搬到合法落点才做一次打断与换出。
 * 两幕：
 *   起（windup，提交前）：压低下盘、双手在身前拢起抓握的褐光，预告这一次贴身。
 *   抓与摔（execute，提交后）：trace 抓住第一个真实接触的可抓者，否则空手收回。抓住后先结算 slam，
 *       命中成功才把人沿一条越肩抛物线带过头顶，落到背离来向的一侧。每一拍用 `hitDisplace` 按真实位移推进：
 *       初推为 0 就地挣脱、撞墙在真碰处 bump，正常走完整条弧才是 land 并做一次打断与换人。
 * 反制：只对一个目标、必须贴身；出手瞬间横移出抓取距离就抓空；摔的飞行会被地形挡住。
 */
namespace PokemonSkills {
    define({
        id: circlethrowId,
        cooldownParameter: "recharge",
        name: "巴投",
        description: "沿瞄准方向贴身抓取第一个真实接触的对手，先吃一记格斗属性接触伤害，再把它越肩摔到自己背后：抛线沿实际位置逐刻推进，撞墙就在真碰处落下。完全抗搬的目标只吃伤害、不被摔飞，也不会被打断或换下；只有真的被搬到合法落点才做一次打断与强制换下。可以朝空处伸手抓空。",
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
            // 手源按面向落在身前：把真实瞄准的水平朝向转成一个世界点交给 bind:"point"。
            const raw = aim(action);
            let heading = WorldCombat.point(raw.x(), 0, raw.z());
            if (heading.length() < 0.01) heading = WorldCombat.point(action.direction().x(), 0, action.direction().z());
            if (heading.length() < 0.01) heading = WorldCombat.point(0, 0, 1);
            const hand = action.origin().plus(heading.unit().scale(0.45));
            action.present("world_combat:move_circlethrow:windup", circlethrowScene, 1, hand,
                JSON.stringify({ moment: "windup", scale: scale, rings: Math.round(p(circlethrowId, "rings", action)),
                    point: [hand.x(), hand.y(), hand.z()] }));
            return prepare;
        },
        indicator: function (config: any, pokemon?: CombatPokemon) {
            return { radius: p(circlethrowId, "grip", pokemon), geometry: "line", style: "throw", color: 0xD89A6A,
                label: config && config.tight ? "巴投·贴身固投" : "巴投" };
        },
        execute: function (action: CombatAction, move: CombatPokemonMove, config: any, done: (current: CombatAction) => void) {
            const world = action.world(), actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const centre = self.position();
            const grip = p(circlethrowId, "grip", action), slam = p(circlethrowId, "slam", action);
            const fling = p(circlethrowId, "fling", action), arc = p(circlethrowId, "arc", action);
            const air = Math.max(2, Math.round(p(circlethrowId, "air", action)));
            const rings = Math.round(p(circlethrowId, "rings", action));
            const scale = (self.width() + self.height()) / 2.3;
            const scenes = WorldFeedback.actionScenes(circlethrowScene, 1);
            const contact = Math.max(0.4, self.width() * 0.6);

            // 真实瞄准：朝向预选目标或瞄准点，水平化后作为抓取射线方向（允许朝空处伸手）。
            const raw = aim(action);
            let heading = WorldCombat.point(raw.x(), 0, raw.z());
            if (heading.length() < 0.01) heading = WorldCombat.point(action.direction().x(), 0, action.direction().z());
            if (heading.length() < 0.01) heading = WorldCombat.point(0, 0, 1);
            heading = heading.unit();

            // 抓取不靠预选：从自身身体前缘之外沿方向做一次真实 trace，第一个可抓的活体接触才是受体；
            // 撞墙或空处则抓空。起点外移避免把自己的身体当成首个接触。
            const from = centre.plus(heading.scale(Math.max(0.4, self.width() * 0.5 + 0.25)));
            const probe = action.trace(from, centre.plus(heading.scale(grip + contact + self.width())), contact, false);
            const candidate = probe.hitEntity() ? probe.target() : null;
            const grabbed: CombatActor | null = candidate !== null && world.valid(candidate)
                && String(candidate.ref()) !== String(actor.ref()) && !world.friendly(candidate) ? candidate : null;
            if (grabbed === null) {
                WorldFeedback.emit(world, circlethrowScene, 1, from, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)), circlethrowMissText, [], 24);
                done(action);
                return;
            }
            const victim = world.observe(grabbed);
            if (victim === null) { done(action); return; }
            const grabbedAt = probe.position();
            if (grabbedAt.minus(centre).length() > grip + contact || !world.clear(centre, grabbedAt)) {
                WorldFeedback.emit(world, circlethrowScene, 1, grabbedAt, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, grabbedAt.plus(WorldCombat.point(0, 1.2, 0)), circlethrowMissText, [], 24);
                done(action);
                return;
            }
            let headingTo = WorldCombat.point(grabbedAt.x() - centre.x(), 0, grabbedAt.z() - centre.z());
            if (headingTo.length() < 0.01) headingTo = heading;
            headingTo = headingTo.unit();
            const over = WorldCombat.point(-headingTo.x(), 0, -headingTo.z());
            const fromPoint = victim.position();
            const ideal = WorldCombat.point(centre.x() + over.x() * fling, fromPoint.y(), centre.z() + over.z() * fling);
            action.face(fromPoint, 20, 20);

            // 抓住：贴身扣住，先结算摔击；命中成功才进入抛投。
            WorldFeedback.emit(world, circlethrowScene, 1, grabbedAt, { moment: "grip", target: String(grabbed.ref()), rings: rings, scale: scale }, 20);
            world.sound("minecraft:entity.player.attack.strong", grabbedAt, 16, "{}");
            const landed = hurt(action, grabbed, circlethrowId, slam, { damage: damageSpec(circlethrowId, "slam"), contact: true });
            if (!landed) {
                WorldFeedback.emit(world, circlethrowScene, 1, grabbedAt, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, grabbedAt.plus(WorldCombat.point(0, 1.2, 0)), circlethrowMissText, [], 24);
                done(action);
                return;
            }
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.5, 0)), circlethrowThrowText, [], 24);
            scenes.show(action, "throw", fromPoint, { moment: "throw", target: String(grabbed.ref()), rings: rings, scale: scale, phase: 0 });
            let step = 0, finished = false;

            /** mode: land 走完整条弧、bump 撞墙、resist 完全抗搬（初推为 0）。 */
            function finish(current: CombatAction, mode: string, at: CombatPoint | null): void {
                if (finished) return;
                finished = true;
                const scope = current.world(), after = scope.observe(grabbed!);
                scenes.stop(current, "throw");
                const spot = at !== null ? at : (after !== null ? after.position() : null);
                if (spot !== null) {
                    if (mode === "land") {
                        WorldFeedback.emit(scope, circlethrowScene, 1, spot,
                            { moment: "land", target: String(grabbed!.ref()), rings: rings, scale: scale }, 22);
                        scope.sound("minecraft:entity.player.attack.strong", spot, 16, "{}");
                        // 只有真的被搬到落点（身体仍在）才做一次打断与换人。
                        if (after !== null) {
                            scope.interrupt(grabbed!, "world_combat:circlethrow");
                            if (partyForceOut(scope, grabbed!, partyFeet(after)) !== null)
                                WorldFeedback.text(scope, spot.plus(WorldCombat.point(0, 1.1, 0)), circlethrowSwitchText, [], 24);
                        }
                    } else if (mode === "bump") {
                        WorldFeedback.emit(scope, circlethrowScene, 1, spot,
                            { moment: "bump", target: String(grabbed!.ref()), rings: rings, scale: scale }, 22);
                        scope.sound("minecraft:block.stone.hit", spot, 12, "{}");
                    } else {
                        WorldFeedback.emit(scope, circlethrowScene, 1, spot,
                            { moment: "resist", target: String(grabbed!.ref()), rings: rings, scale: scale }, 22);
                    }
                }
                scenes.finish(current, done);
            }

            function fly(current: CombatAction): void {
                const scope = current.world(), now = scope.observe(grabbed!);
                if (now === null) { finish(current, "land", null); return; }
                step++;
                const t = Math.min(1, step / air);
                const desired = fromPoint.plus(ideal.minus(fromPoint).scale(t)).plus(WorldCombat.point(0, arc * 4 * t * (1 - t), 0));
                const delta = desired.minus(now.position());
                const applied = scope.hitDisplace(grabbed!, delta);
                // 初推为 0：完全抗搬，只留下这一记抓摔伤害，不播飞行、不打断、不换人。
                if (step === 1 && !(applied > 0.01)) { finish(current, "resist", now.position()); return; }
                const wall = WorldGeometry.blockHit(scope, now.position(), desired);
                if (wall !== null && applied < delta.length() - 0.05) { finish(current, "bump", wall.position()); return; }
                const at = scope.observe(grabbed!);
                if (at !== null) scenes.show(current, "throw", at.position(),
                    { moment: "throw", target: String(grabbed!.ref()), rings: rings, scale: scale, phase: Math.round(t * 100) / 100 });
                if (step >= air) { finish(current, "land", at !== null ? at.position() : null); return; }
                current.after(1, function (next: CombatAction) { fly(next); });
            }

            action.after(1, function (next: CombatAction) { fly(next); });
        }
    });
}
