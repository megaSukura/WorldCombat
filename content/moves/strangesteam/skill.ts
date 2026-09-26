/**
 * 神奇蒸汽 / strangesteam —— 注册与动作。
 *
 * 核心念头：一柱**会停留的迷幻蒸汽**。施法者朝选定地点喷出一柱滚烫蒸汽，蒸汽沿直线前进、被真实墙挡在
 * 到达处，在那里散成一片低垂的云；第一次被喷到的人挨一下烫伤并可能看得恍惚，留在云里会被蒸汽持续熏着、
 * 恍惚被不断续上。它是本族唯一留下一片区域、影响后来者的成员。
 *
 * 三幕：
 *   起（windup，提交前）：气孔里把蒸汽收成一点粉白，只播预告。
 *   喷（jet，提交后）：朝落点喷出一柱蒸汽；喷口到落点用原生方块射线按真墙截断，云放在实际到达处（门墙后不凭空开雾）。
 *   熏（cloud，场地规则）：云每 5 刻扫一次；首次入云的非友方结算 scald 并按 confuseChance 掷迷幻
 *       （本单元自己的共享身份载体 world_combat:status/confusion）；留在云里的人按 3 秒节拍被 sear 续熏、恍惚续上。
 *
 * 修整要点：
 *   - 半径公式只求一次（dense 已在 parameters.ts 的公式里乘过），预告与真实 field 同值。
 *   - 真实首喷时立刻 `next = now + refresh`，后续保持节拍，不再下一 scan 就追加续熏。
 *   - 首喷与续熏都只在 `hurt` 实际造成伤害后才尝试迷幻；免疫实伤者不因失败喷熏自动迷幻。
 *   - 上限只按“实际结算过伤害的新处理者”计：等待下次续熏的目标不占 cap，避免旧目标饿死新进入者。
 *   - 云盘表现绑在 field 自己的托管效果上（WorldFeedback.onEffect），随云自然到期或被驱散一起收。
 */
namespace PokemonSkills {
    function strangesteamCentre(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }

    // 云的行为：续播画面；首次入云烫 + 掷迷幻，留下的按节拍续熏并续恍惚。规则登记一次，全场共用。
    WorldEffects.fieldRule(strangesteamField, {
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            if (!(field.data && typeof field.data.scald === "number")) return;
            const centre = strangesteamCentre(field), radius = field.radius;
            const scale = radius / 2.6;
            // 持续圆盘雾绑在云自身的托管效果上：云被驱散或到期，画面同步收束，不靠固定时长的 keep 硬撑。
            WorldFeedback.onEffect(world, effect.id(), "strangesteam:cloud", strangesteamScene, 1, centre,
                { moment: "cloud", scale: scale, radius: radius, motes: field.data.motes });
            const actors = world.query(centre, radius, false);
            const now = world.tick();
            const hit = field.data.hit || (field.data.hit = {});
            const next = field.data.next || (field.data.next = {});
            const refresh = Math.max(20, Math.round(field.data.refresh || 60));
            const cap = Math.max(1, Math.round(field.data.maxTargets || 4));
            let applied = 0;

            // 先处理首次入云的新目标：它们优先占用上限，等待下次续熏的目标不占位。
            for (let i = 0; i < actors.length && applied < cap; i++) {
                const actor = actors[i];
                if (!world.valid(actor) || world.friendly(actor)) continue;
                const ref = String(actor.ref());
                if (hit[ref]) continue;
                const body = world.observe(actor);
                if (body === null || !world.clear(centre, body.position())) continue;
                hit[ref] = true;
                next[ref] = now + refresh;
                const landed = hurt(world, actor, strangesteamId, field.data.scald, { damage: damageSpec(strangesteamId, "scald") });
                if (!landed) continue;
                applied++;
                if (world.valid(actor) && world.random() < field.data.chance)
                    CombatStatus.apply(world, actor, "confusion", strangesteamEffect, field.data.daze, field.data.fumble, { unique: true });
                WorldFeedback.emit(world, strangesteamScene, 1, body.position(),
                    { moment: "hit", target: ref, motes: field.data.motes, scale: scale }, 24);
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.15, 0)), strangesteamDazeText, [], 26);
            }
            // 再轮到已经在节拍上、到点的续熏。
            for (let i = 0; i < actors.length && applied < cap; i++) {
                const actor = actors[i];
                if (!world.valid(actor) || world.friendly(actor)) continue;
                const ref = String(actor.ref());
                if (!hit[ref] || now < (next[ref] || 0)) continue;
                const body = world.observe(actor);
                if (body === null || !world.clear(centre, body.position())) continue;
                next[ref] = now + refresh;
                const landed = hurt(world, actor, strangesteamId, field.data.sear, { damage: damageSpec(strangesteamId, "sear") });
                if (!landed) continue;
                applied++;
                if (world.valid(actor))
                    CombatStatus.apply(world, actor, "confusion", strangesteamEffect, field.data.daze, field.data.fumble, { unique: true });
                WorldFeedback.emit(world, strangesteamScene, 1, body.position(),
                    { moment: "sear", target: ref, motes: field.data.motes, scale: scale }, 20);
            }
        }
    });

    define({
        id: strangesteamId,
        cooldownParameter: "recharge",
        name: "Strange Steam",
        description: "朝选定地点喷出一柱迷幻蒸汽，蒸汽沿直线前进、被真墙挡在到达处：云里第一次被喷到的人挨一记烫伤并可能迷得恍惚；留在云里会被持续熏着，恍惚被不断续上。门墙后不会凭空开雾。",
        uses: ["封住一个落点或门口", "一次罩住几个挤在一起的敌人", "用停留的云持续压制进出的人"],
        kind: "point",
        range: 8,
        maxRange: 13,
        prepare: 12,
        active: 1,
        recover: 9,
        cooldown: 30,
        style: "fairy",
        defaults: { dense: false, ai: { maxChase: 12, crowd: true, finish: true } },
        fields: [flag("dense", "浓雾")],
        indicator: function (config, pokemon) {
            const dense = config && config.dense === true;
            return { radius: Math.round(p(strangesteamId, "radius", pokemon) * 100) / 100,
                geometry: "area", style: "fairy", color: 0xE89AC8, label: dense ? "神奇蒸汽·浓雾" : "神奇蒸汽·喷发" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[strangesteamId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(strangesteamId, "tempo", context)),
                recover: Math.round(p(strangesteamId, "aftercast", context)),
                cooldown: Math.round(p(strangesteamId, "recharge", context)),
                active: 1,
                range: p(strangesteamId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:strangesteam:windup", strangesteamScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", dense: config && config.dense === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const aimPoint = action.targetPosition(), origin = action.origin();
            // 半径公式只求一次（dense 已在公式里乘过）；预告、喷射与真实 field 用同一个值。
            const radius = Math.max(1.2, Math.min(4.2, Math.round(p(strangesteamId, "radius", action) * 100) / 100));
            const ticks = Math.max(80, Math.round(p(strangesteamId, "cloudTicks", action)));
            const scale = radius / 2.6;
            const motes = Math.max(14, Math.round(p(strangesteamId, "motes", action)));
            const delta = aimPoint.minus(origin), distance = delta.length();
            const direction = distance < 0.01 ? action.direction() : delta.unit();
            // 喷口到落点按真墙截断：云放在实际到达处，门墙后不再凭空开雾。
            let landing = aimPoint;
            const clip = world.clipBlocks(origin, aimPoint);
            if (clip !== null && clip.blocked()) landing = clip.position();
            const jet = Math.max(0, landing.minus(origin).length());
            sound(action, "minecraft:block.fire.extinguish");
            WorldFeedback.emit(world, strangesteamScene, 1, origin,
                { moment: "jet", direction: [direction.x(), direction.y(), direction.z()], distance: jet,
                    motes: motes, scale: scale }, 28);
            WorldEffects.field(world, strangesteamField, landing, radius, {
                scald: p(strangesteamId, "scald", action),
                sear: p(strangesteamId, "sear", action),
                chance: Math.max(0.02, Math.min(0.9, p(strangesteamId, "confuseChance", action))),
                daze: Math.max(40, Math.round(p(strangesteamId, "dazeTicks", action))),
                fumble: Math.round(Math.max(0.05, Math.min(0.9, p(strangesteamId, "fumble", action))) * 100),
                refresh: 60,
                maxTargets: Math.max(1, Math.round(p(strangesteamId, "maxTargets", action))),
                motes: motes, hit: {}, next: {}
            }, ticks);
            WorldFeedback.emit(world, strangesteamScene, 1, landing,
                { moment: "bloom", radius: radius, motes: motes, scale: scale }, 30);
            WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 0.9, 0)), strangesteamCloudText, [], 30);
            sound(action, "minecraft:entity.blaze.shoot");
            done(action);
        }
    });


    // 迷幻存续期：目标身侧持续飘出没散尽的蒸汽，低密度、每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_strangesteam/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== strangesteamEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "strangesteam:linger:" + String(actor.ref()), strangesteamScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
