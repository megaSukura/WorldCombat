/**
 * 臂锤 / hammerarm 的出手方式。
 *
 * 核心念头：**过顶横挥的一记重锤**——把整条手臂抡过头顶、借上身重量砸在单个目标身上；砸实那一下把目标
 *   砸退，拳面落点把真实接触的地材质震出一圈短放射尘线，自己则因惯性踉跄、速度按实际事实下降。这一记
 *   卖的是「一次最重的原地单体交换」。
 *
 * 三幕（提交前只播预告）：
 *   起（hoist）：手臂高举过顶、拳边聚起斗气，长前摇、可被打断，只播预告。
 *   砸（swing → slam/wall/miss）：提交后自由瞄准，沿一条**真实短下砸拳路** `trace` 首个接触；先碰实体且伤害
 *       成立才把目标沿接触方向砸退 `knock`、按实际体重与物攻震出 `dents` 条尘线；碰真墙只在墙面扬尘，不伤
 *       墙后的人，也不动地形；什么都没碰到就只留扑空的尘。
 *   沉（stagger）：命中并真的降速后才浮字，显示**实际降下的级数**；已在最低速时不报固定降 1。
 *
 * 与同族分开：狂舞挥打是原地转整圈的覆盖、疾速转轮是贴地旋转冲进、冰锤是裹冰垂直下砸留冰面；
 *   臂锤是唯一「横挥斗气重拳 + 砸退 + 真实接触地材尘线」的原地单体重砸。
 *
 * 配置 `followthrough` 由公式改威力／砸退／尘线／时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const hammerarmScene = "world_combat:move_hammerarm";
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
            const dir = aim(action);
            const reach = Math.max(1.8, action.range());
            const power = p("hammerarm", "hammer", action);
            const knock = p("hammerarm", "knock", action);
            const cleft = Math.max(0.6, p("hammerarm", "cleft", action));
            const dents = Math.max(4, Math.round(p("hammerarm", "dents", action)));
            const speedLoss = Math.max(0, Math.round(p("hammerarm", "speedLoss", action)));
            const scale = Math.max(0.6, Math.min(2.0, cleft / 1.1));
            const intensity = Math.max(0.6, Math.min(2.2, power / 100));
            const gauge = Math.max(0.3, Math.min(1.0, body.width() * 0.5));
            const start = centre.plus(dir.scale(0.15));
            const rawEnd = centre.plus(dir.scale(reach));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

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

            // 真实短下砸拳路：从身体沿瞄准方向（含俯仰）伸出，首碰实体或真墙即止；判定与表现共用同一终点。
            const contact = action.trace(start, rawEnd, gauge, true);
            const end = contact.hitEntity() || contact.blocked() ? contact.position() : rawEnd;
            WorldFeedback.emit(world, hammerarmScene, 1, start,
                { moment: "swing", path: [[start.x(), start.y(), start.z()], [end.x(), end.y(), end.z()]],
                    direction: [dir.x(), dir.y(), dir.z()], radius: cleft, dents: dents, scale: scale, intensity: intensity }, 18);

            if (contact.hitEntity()) {
                let victim = contact.target();
                if (victim !== null && (String(victim.ref()) === String(actor.ref()) || world.friendly(victim))) victim = null;
                if (victim === null) { finish(action); return; }
                const landed = hurt(action, victim, "hammerarm", power,
                    { damage: damageSpec("hammerarm", "hammer"), contact: true, punch: true });
                const body1 = world.observe(victim);
                const point = body1 === null ? contact.position() : body1.position();
                if (landed) {
                    let pushed = 0;
                    if (world.valid(victim)) {
                        const away = WorldCombat.point(point.x() - centre.x(), 0, point.z() - centre.z());
                        if (away.length() >= 0.05) pushed = world.hitDisplace(victim, away.unit().scale(knock));
                    }
                    const body2 = world.observe(victim);
                    const at = body2 === null ? point : body2.position();
                    WorldFeedback.emit(world, hammerarmScene, 1, at,
                        { moment: "slam", target: String(victim.ref()), dents: dents, radius: cleft,
                            pushed: Math.round(pushed * 100) / 100, tint: hammerarmSurfaceTint(world, at),
                            scale: scale, intensity: intensity }, 22);
                    world.sound("cobblemon:impact.fighting", at, 15, "{}");
                    stagger(action);
                } else {
                    WorldFeedback.emit(world, hammerarmScene, 1, point,
                        { moment: "blocked", target: String(victim.ref()), scale: scale }, 20);
                    sound(action, "minecraft:entity.player.attack.nodamage");
                }
                finish(action);
                return;
            }

            if (contact.blocked()) {
                const cell = contact.blockPosition();
                const at = cell === null ? contact.position() : cell;
                WorldFeedback.emit(world, hammerarmScene, 1, at,
                    { moment: "wall", face: contact.blockFace(), dents: dents, radius: cleft,
                        tint: hammerarmSurfaceTint(world, at), scale: scale, intensity: intensity }, 22);
                world.sound("minecraft:block.deepslate.break", at, 15, "{}");
                finish(action);
                return;
            }

            WorldFeedback.emit(world, hammerarmScene, 1, rawEnd, { moment: "miss", dents: dents, scale: scale }, 20);
            WorldFeedback.text(world, rawEnd.plus(WorldCombat.point(0, 1.0, 0)), hammerarmMissText, [], 22);
            sound(action, "minecraft:entity.player.attack.weak");
            finish(action);
        }
    });
}
