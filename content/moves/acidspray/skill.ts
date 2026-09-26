/**
 * 酸液炸弹 / acidspray —— 注册与动作。
 *
 * 核心念头：**贴脸喷出一整片短而宽的酸雾，把身前楔形里每个人的特防一次溶掉两级**——不脱手、没有飞行物，
 * 喷完就散，不在地上留危险区。它是纯工具：用最便宜的一口，替队伍后面的特殊招先把防线打开。
 *
 * 三幕：
 *   起（windup，提交前）：喉间与口边聚起酸滴（`action.present` 预告，不碰世界）。
 *   喷（execute）：以施法者为顶点的楔形里每个敌人各结算一次 `core` 伤害，并在真的被淋到时
 *       `NativeEffects.boost(..., "spd", -2)`；判定与画面共用同一组楔角、射程顶点。
 *   散：喷完即止，余雾很快散掉——不驻留、不重复伤害、也不继续掉防。
 *
 * 选取 `kind: "aim"`：自由方向近喷，也能直接点实体；空喷照喷（`target` 为 null 时沿提交朝向），
 * 不要求存在敌人，也不在地面生成区域。命中权限仍由命中层按敌我结算。
 *
 * 配置 `focus`（聚焦喷口）只做角度与射程的取舍：开启＝更窄更远；关闭＝最宽的一口。
 */
namespace PokemonSkills {
    const acidsprayScene = "world_combat:move_acidspray";
    const acidspraySunderText = "world_combat.move.acidspray.text.sunder";

    /** 把判定的水平扇区采样为世界顶点，喷淋面与轮廓共用。 */
    function acidsprayPath(origin: CombatPoint, direction: CombatPoint, range: number, angle: number): number[][] {
        const path = [[origin.x(), origin.y(), origin.z()]], steps = Math.max(3, Math.ceil(angle / 5));
        for (let i = 0; i <= steps; i++) {
            const turn = (i / steps - 0.5) * angle * Math.PI / 180, cos = Math.cos(turn), sin = Math.sin(turn);
            path.push([origin.x() + (direction.x() * cos - direction.z() * sin) * range, origin.y(),
                origin.z() + (direction.x() * sin + direction.z() * cos) * range]);
        }
        return path;
    }

    define({
        id: "acidspray",
        name: "Acid Spray",
        description: "在身前喷出一道短而宽的酸雾：楔形里的每个敌人各挨一次特殊伤害、特防立刻下降 2 级，喷完即散，不驻留也不继续掉防。自由方向近喷，也能直接点实体；空喷照喷。聚焦喷口更窄更远，宽喷一次罩住一片。",
        uses: ["贴脸一次淋掉身前一群对手的两级特防", "用最便宜的出手反复磨特防", "在窄口把想挤过来的对手连人带路一起喷酸"],
        kind: "aim",
        range: 5,
        maxRange: 9,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 22,
        style: "corrosive",
        defaults: { focus: false, ai: { maxChase: 8, crowd: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("acidspray", "sprayRange", pokemon), geometry: "area", style: "corrosive",
                color: 0x8FCB3A, label: config && config.focus === true ? "聚焦喷口酸液炸弹" : "宽喷酸液炸弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["acidspray"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("acidspray", "tempo", context)),
                recover: 8,
                cooldown: 22,
                active: 0,
                range: p("acidspray", "sprayRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:acidspray:" + action.id(), acidsprayScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", focus: config && config.focus ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const aim = WorldGeometry.flatUnit(PokemonSkills.aim(action), action.direction());
            const power = p("acidspray", "core", action);
            const range = Math.max(3.0, p("acidspray", "sprayRange", action));
            const angle = Math.max(20, p("acidspray", "sprayAngle", action));
            const drops = Math.max(10, Math.round(p("acidspray", "droplets", action)));
            const stages = Math.max(1, Math.round(p("acidspray", "sunderStages", action)));
            const scale = Math.max(0.5, Math.min(2.4, range / 5.0));
            const intensity = Math.max(0.5, Math.min(2.2, power / 38));
            const direction = [aim.x(), aim.y(), aim.z()];
            // 雾面贴地画在施法者脚下，与判定的水平楔形使用同一组顶点。
            const ground = WorldGeometry.ground(world, origin);
            const path = acidsprayPath(WorldCombat.point(origin.x(), ground.y(), origin.z()), aim, range, angle);
            let hits = 0;

            sound(action, "cobblemon:move.acidspray.actor");
            const region = WorldGeometry.sector(origin, aim, range, angle, { below: 2, above: 3 });
            WorldGeometry.selectEnemies(world, region, function (enemy, facts) {
                // 只有真的被这一口淋到（伤害许可通过）才掉防、才冒腐蚀光。
                if (!hurt(action, enemy, "acidspray", power, { damage: damageSpec("acidspray", "core") })) return;
                hits++;
                NativeEffects.boost(world, enemy, "spd", -stages);
                WorldFeedback.emit(world, acidsprayScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), drops: drops, scale: scale, intensity: intensity }, 22);
                WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.2, 0)), acidspraySunderText, [stages], 30);
            });
            // 单次楔面：无论有没有淋到人，这一喷都照画，空喷也有视觉回执。
            WorldFeedback.emit(world, acidsprayScene, 1, origin,
                { moment: "spray", path: path, direction: direction, range: range, angle: angle, drops: drops,
                    intensity: intensity, hits: hits }, 20);
            if (hits > 0) sound(action, "cobblemon:move.acidspray.target");
            done(action);
        }
    });
}
