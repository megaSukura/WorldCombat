/**
 * 臂锤 / hammerarm 的出手方式。
 *
 * 核心念头：**过顶横挥的一记重锤**——把整条手臂抡过头顶、借上身重量砸在单个目标身上；砸实那一下把目标
 *   砸退，拳面落点把真实接触的地材质震出一圈短放射尘线，自己则因惯性踉跄、速度按实际事实下降。这一记
 *   卖的是「一次最重的原地单体交换」。
 *
 * 三幕（提交前只播预告）：
 *   起（hoist）：手臂高举过顶、拳边聚起斗气，长前摇、可被打断，只播预告。
 *   砸（swing → slam/wall/miss）：提交后自由瞄准，沿一条**有界单次过顶拳面弧**逐刻 `trace` 当前真实子段；弧顶
 *       足够高，矮顶会真的挡住拳路。首碰实体且伤害成立才把目标沿接触方向砸退 `knock`（按**实际受害者体重**），
 *       并在真实接触点下方的可达支撑顶面扬出 `dents` 条尘线；碰真墙用真实接触位置/面闪，不伤墙后的人，也不动
 *       地形；什么都没碰到就只在弧尖留扑空的尘。
 *   沉（stagger）：命中并真的降速后才浮字，显示**实际降下的级数**；已在最低速时不报固定降 1。
 *
 * 与同族分开：狂舞挥打是原地转整圈的覆盖、疾速转轮是贴地旋转冲进、冰锤是裹冰垂直下砸留冰面；
 *   臂锤是唯一「横挥斗气重拳 + 砸退 + 真实接触地材尘线」的原地单体重砸。
 *
 * 配置 `followthrough` 由公式改威力／砸退／尘线／时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const hammerarmScene = "world_combat:move_hammerarm";
    const hammerarmFistScene = "world_combat:move_hammerarm/fist";
    const hammerarmStaggerText = "world_combat.move.hammerarm.text.stagger";
    const hammerarmMissText = "world_combat.move.hammerarm.text.miss";

    /** 真实接触地材映射成尘线颜色：黄沙、砾石、草、深板岩、雪、石与土各一色，认不出就用中性土色。 */
    function hammerarmTint(id: string): number {
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return 0xD9C08A;
        if (id === "minecraft:gravel") return 0x9A9088;
        if (id === "minecraft:grass_block" || id === "minecraft:moss_block" || id === "minecraft:podzol") return 0x6E8A48;
        if (id.indexOf("deepslate") >= 0) return 0x5A5660;
        if (id === "minecraft:snow_block" || id.indexOf("snow") >= 0 || id === "minecraft:ice" || id === "minecraft:packed_ice") return 0xCFE4EE;
        if (id.indexOf("stone") >= 0 || id === "minecraft:tuff" || id === "minecraft:granite" ||
            id === "minecraft:diorite" || id === "minecraft:andesite" || id === "minecraft:cobblestone") return 0x8A8A86;
        if (id.indexOf("dirt") >= 0 || id === "minecraft:clay") return 0x8C6A48;
        return 0x8C7448;
    }

    /** 找落点下方可达的真实地表，按它的材质给尘线上色；没有地面就返回中性土色。 */
    function hammerarmSurfaceTint(world: CombatWorld, at: CombatPoint): number {
        const bx = Math.floor(at.x()), bz = Math.floor(at.z()), by = Math.floor(at.y()) + 1;
        for (let dy = by; dy >= by - 3; dy--) {
            const block = world.block(WorldCombat.point(bx, dy, bz));
            if (block === null) break;
            const id = String(block.id());
            if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
            return hammerarmTint(id);
        }
        return 0x8C7448;
    }

    define({
        id: "hammerarm",
        cooldownParameter: "recharge",
        name: "Hammer Arm",
        description: "自由瞄准一记过顶重锤：沿真实下砸拳路先碰到谁就砸谁，砸中把目标砸退、并用真实接触的地材质在落点震出一圈短尘线；自己则因惯性踉跄、速度按实际事实下降。碰墙或空挥不伤任何原目标，也不改变地形。顺势式砸得更远、扬得更开，代价是单发更轻、出手更慢。",
        uses: ["用一记过顶重砸换掉一个硬目标", "把目标砸出阵地、砸退到队友够得到的地方", "在真实接触点用接触地材质扬出一圈短尘线"],
        kind: "aim",
        range: 2.6,
        maxRange: 3.6,
        prepare: 14,
        active: 0,
        recover: 11,
        cooldown: 34,
        maximumTicks: 200,
        style: "armhammer",
        defaults: { followthrough: false, ai: { maxChase: 6, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("hammerarm", "reach", pokemon) : 2.6, geometry: "line", style: "armhammer",
                color: 0xC46A3A, label: config && config.followthrough === true ? "顺势式" : "屏息式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["hammerarm"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("hammerarm", "tempo", context)),
                recover: Math.round(p("hammerarm", "aftercast", context)),
                cooldown: Math.round(p("hammerarm", "recharge", context)),
                active: 0,
                range: p("hammerarm", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("hammerarm:hoist", hammerarmScene, 1, action.origin(),
                JSON.stringify({ moment: "hoist", windup: prepare, followthrough: config && config.followthrough === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const height = body.height();
            const dir = aim(action);
            // 水平朝向给空间弧，上/右用稳定正交基（含竖直瞄准的退化输入回退到 +Z）。
            const heading = WorldGeometry.flatUnit(dir, WorldCombat.point(0, 0, 1));
            const forward = WorldCombat.point(heading.x(), 0, heading.z());
            const frame = WorldGeometry.basis(forward);
            const reach = Math.max(1.8, action.range());
            const power = p("hammerarm", "hammer", action);
            const cleft = Math.max(0.6, p("hammerarm", "cleft", action));
            const dents = Math.max(4, Math.round(p("hammerarm", "dents", action)));
            const speedLoss = Math.max(0, Math.round(p("hammerarm", "speedLoss", action)));
            const scale = Math.max(0.6, Math.min(2.0, cleft / 1.1));
            const intensity = Math.max(0.6, Math.min(2.2, power / 100));
            const gauge = Math.max(0.3, Math.min(1.0, body.width() * 0.5));
            // 有界单次过顶拳面轨迹：高举过顶 → 斜跨向前回收，弧顶足够高，矮顶会挡住拳路。
            const apex = height * 1.15 + reach * 0.45;
            const lateral = Math.max(0.3, body.width() * 1.1);
            const sweepTicks = Math.max(4, Math.min(9, Math.round(reach * 2)));
            const start = centre.plus(forward.scale(reach * 0.32)).plus(frame.up.scale(apex)).plus(frame.right.scale(lateral));
            const end = centre.plus(dir.scale(reach));
            const control = centre.plus(forward.scale(reach * 0.62)).plus(frame.up.scale(apex * 1.12)).plus(frame.right.scale(lateral * 0.5));
            const scenes = WorldFeedback.actionScenes(hammerarmScene);
            const fistKey = "hammerarm:fist:" + action.id();
            let settled = false;

            /** 二次贝塞尔弧上一点：t=0 是高举的拳，t=1 落在瞄准点。 */
            function tipAt(t: number): CombatPoint {
                return start.scale((1 - t) * (1 - t)).plus(control.scale(2 * (1 - t) * t)).plus(end.scale(t * t));
            }

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            /** 停止当前拳形的客户端绘制；动作结束时随 present 一并清理。 */
            function stopFist(current: CombatAction, at: CombatPoint): void {
                current.present(fistKey, hammerarmFistScene, 1, at,
                    JSON.stringify({ lifecycle: { reason: "settled", tick: current.sense().tick() } }));
            }

            /** 命中且真的降了速才显示；已在最低速时 boost 返回 0，不报固定降 1。 */
            function stagger(current: CombatAction): void {
                const scope = current.world();
                const applied = NativeEffects.boost(scope, actor, "spe", -speedLoss);
                if (applied === 0) return;
                const after = scope.observe(actor);
                const above = (after === null ? centre : after.position()).plus(WorldCombat.point(0, 1.3, 0));
                WorldFeedback.emit(scope, hammerarmScene, 1, above,
                    { moment: "stagger", speedLoss: Math.abs(applied), fatigue: Math.round(10 + Math.abs(applied) * 8), intensity: intensity }, 20);
                WorldFeedback.text(scope, above, hammerarmStaggerText, [Math.abs(applied)], 28);
            }

            /** 可达支撑顶面扬出一圈尘线；没有地面（空中目标/悬空）就只在接触点留拳劲，不凭空铺尘。 */
            function groundDust(scope: CombatWorld, at: CombatPoint): void {
                const surface = SurfacePaths.support(scope, at, 1.5, 4);
                if (surface === null) return;
                WorldFeedback.emit(scope, hammerarmScene, 1, surface,
                    { moment: "dust", dents: dents, radius: cleft, tint: hammerarmSurfaceTint(scope, surface), scale: scale, intensity: intensity }, 22);
            }

            /** 命中首个实体：按**实际受害者体重**砸退，尘落在真实接触点下方的可达支撑顶面。 */
            function landEntity(current: CombatAction, contact: CombatImpact): void {
                const scope = current.world();
                const victim = contact.target();
                if (victim === null || String(victim.ref()) === String(actor.ref()) || scope.friendly(victim)) { stopFist(current, contact.position()); finish(current); return; }
                const knock = p("hammerarm", "knock", withTarget(factContext(current), victim));
                const landed = hurt(current, victim, "hammerarm", power,
                    { damage: damageSpec("hammerarm", "hammer"), contact: true, punch: true });
                const body1 = scope.observe(victim);
                const point = body1 === null ? contact.position() : body1.position();
                if (landed) {
                    let pushed = 0;
                    if (scope.valid(victim)) {
                        const away = WorldCombat.point(point.x() - centre.x(), 0, point.z() - centre.z());
                        if (away.length() >= 0.05) pushed = scope.hitDisplace(victim, away.unit().scale(knock));
                    }
                    const body2 = scope.observe(victim);
                    const at = body2 === null ? point : body2.position();
                    WorldFeedback.emit(scope, hammerarmScene, 1, at,
                        { moment: "slam", target: String(victim.ref()), dents: dents, radius: cleft,
                            pushed: Math.round(pushed * 100) / 100, scale: scale, intensity: intensity }, 22);
                    groundDust(scope, contact.position());
                    scope.sound("cobblemon:impact.fighting", at, 15, "{}");
                    stagger(current);
                } else {
                    WorldFeedback.emit(scope, hammerarmScene, 1, point,
                        { moment: "blocked", target: String(victim.ref()), scale: scale }, 20);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                }
                stopFist(current, point);
                finish(current);
            }

            /** 墙闪：用真实接触位置与方块面，不改用方块格坐标。 */
            function landWall(current: CombatAction, contact: CombatImpact): void {
                const scope = current.world();
                const at = contact.position();
                WorldFeedback.emit(scope, hammerarmScene, 1, at,
                    { moment: "wall", face: contact.blockFace(), dents: dents, scale: scale, intensity: intensity }, 22);
                scope.sound("minecraft:block.deepslate.break", at, 15, "{}");
                stopFist(current, at);
                finish(current);
            }

            /** 沿真实过顶弧逐刻 trace：每刻发当前真实子段，首碰实体/真墙即止，一次命中。 */
            function swing(current: CombatAction, tick: number, from: CombatPoint): void {
                const progress = sweepTicks <= 1 ? 1 : Math.min(1, (tick + 1) / sweepTicks);
                const tip = tipAt(progress);
                scenes.show(current, "swing", tip,
                    { moment: "swing", path: [[from.x(), from.y(), from.z()], [tip.x(), tip.y(), tip.z()]],
                        direction: [dir.x(), dir.y(), dir.z()], radius: cleft, scale: scale, intensity: intensity });
                current.present(fistKey, hammerarmFistScene, 1, tip,
                    JSON.stringify({ moment: "fist", point: [tip.x(), tip.y(), tip.z()], from: [from.x(), from.y(), from.z()],
                        direction: [dir.x(), dir.y(), dir.z()], progress: progress, scale: scale, intensity: intensity }));
                const contact = current.trace(from, tip, gauge, true);
                if (contact.hitEntity()) { landEntity(current, contact); return; }
                if (contact.blocked()) { landWall(current, contact); return; }
                if (progress >= 1) {
                    WorldFeedback.emit(current.world(), hammerarmScene, 1, tip, { moment: "miss", dents: dents, scale: scale }, 20);
                    WorldFeedback.text(current.world(), tip.plus(WorldCombat.point(0, 1.0, 0)), hammerarmMissText, [], 22);
                    sound(current, "minecraft:entity.player.attack.weak");
                    stopFist(current, tip);
                    finish(current);
                    return;
                }
                current.after(1, function (next: CombatAction) { swing(next, tick + 1, tip); });
            }

            swing(action, 0, start);
        }
    });
}
