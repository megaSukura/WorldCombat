/**
 * 魔法闪耀 / dazzlinggleam 的出手方式。
 *
 * 核心念头：把周身的微光收拢到身上再猛地放开——一片强光以自身为中心整圈炸开，身周每个看得见这道光的敌人一起被闪到，
 * 离得越远越弱；被闪花眼的人一时脚下发虚、走得慢。没有飞行物，光就是它的范围；起手极短，是一记可以反复点的
 * 整圈闪光。
 *
 * 两幕：
 *   起（windup，提交前）：微光从身周向身上收拢、脚下浮起一圈将亮未亮的光环，只播预告。
 *   闪（execute，提交后）：光浪整圈铺开；以身体为中心的**真实 3D 光球**圈住每个身体与球相交、且与中心之间没有墙挡着的
 *       非友方，按到中心的 3D 距离衰减后各挨一次 `flash`。伤害真的落地后，才尝试挂 `world_combat:dazzled`
 *       （共享身份 world_combat:status/dazzled，移动速度下降）；状态被拒（控免 Boss）也照吃主伤，只是不亮“变慢”反馈。
 *       每个实际受击者的亮点用一条光路连回中心，让“谁被闪到”从画面就能读出。
 *
 * 与同为整圈爆发的爆音波分开：爆音波是声压、有击飞与耳鸣；魔法闪耀是光、不击飞，只留一记目眩减速。
 */
namespace PokemonSkills {
    const dazzlinggleamScene = "world_combat:move_dazzlinggleam";
    const dazzlinggleamDazzled = "world_combat:dazzled";
    const dazzlinggleamHitText = "world_combat.move.dazzlinggleam.text.hit";
    const dazzlinggleamMissText = "world_combat.move.dazzlinggleam.text.miss";

    define({
        id: "dazzlinggleam",
        cooldownParameter: "recharge",
        name: "Dazzling Gleam",
        description: "把周身的微光收拢再放开，一片强光以自身为中心整圈炸开：身周看得见强光的每个敌人各挨一次闪光伤害，离得越远越弱；被闪花眼、且挡不住状态的人移动变慢一段时间。墙能把光挡住，躲在墙后就不吃这一下。散射式铺得更开、边缘更均匀；凝聚式更重、目眩更久。",
        uses: ["被贴身时一次闪开身边一圈敌人", "扫掉围上来的小目标", "给一圈人补上目眩减速，拖住他们的脚步", "起手极短的整圈收尾手段"],
        kind: "self",
        range: 3.4,
        maxRange: 6.2,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 24,
        style: "flash",
        defaults: { wide: false, ai: { maxChase: 9, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dazzlinggleam", "radius", pokemon), geometry: "area", style: "flash",
                color: 0xFFD9F2, label: config && config.wide === true ? "散射强光" : "凝聚强光" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dazzlinggleam"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dazzlinggleam", "tempo", context)),
                recover: Math.round(p("dazzlinggleam", "aftercast", context)),
                cooldown: Math.round(p("dazzlinggleam", "recharge", context)),
                active: 0,
                range: p("dazzlinggleam", "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            const radius = Math.max(2.4, p("dazzlinggleam", "radius", action));
            action.present("world_combat:move_dazzlinggleam:charge", dazzlinggleamScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", radius: radius,
                    rays: Math.max(6, Math.round(p("dazzlinggleam", "rays", action))), scale: radius / 3.4, wide: !!(config && config.wide) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.4, p("dazzlinggleam", "radius", action));
            const power = p("dazzlinggleam", "flash", action);
            const falloff = Math.max(0.4, Math.min(0.8, p("dazzlinggleam", "falloff", action)));
            const dazzle = Math.max(24, Math.round(p("dazzlinggleam", "dazzleTicks", action)));
            const rays = Math.max(6, Math.round(p("dazzlinggleam", "rays", action)));
            const motes = Math.max(16, Math.round(p("dazzlinggleam", "motes", action)));
            const cap = Math.max(1, Math.round(p("dazzlinggleam", "maxTargets", action)));
            const scale = radius / 3.4;
            let hits = 0;

            // 真正的 3D 可见球面：用身体碰撞箱与球的精确相交挑人，再按原生通视把墙后的挡掉。
            WorldGeometry.selectBodies(world, WorldGeometry.bodySphere(centre, radius), function (enemy, facts) {
                if (String(enemy.ref()) === String(actor.ref()) || facts.friendly() || hits >= cap) return;
                if (!world.clear(centre, facts.position())) return;
                const distance = facts.position().minus(centre).length();
                const reach = radius <= 0 ? 0 : Math.min(1, distance / radius);
                const strength = 1 - (1 - falloff) * reach;
                const landed = hurt(action, enemy, "dazzlinggleam", power * strength, { damage: damageSpec("dazzlinggleam", "flash") });
                if (!landed) return;
                hits++;
                // 伤害真的落地后，才尝试挂目眩；状态被拒（控免等）不再假装“变慢成功”。
                const leftDazzled = world.valid(enemy) && MobEffects.apply(world, enemy, dazzlinggleamDazzled, dazzle, 0) !== null;
                const eye = facts.position().plus(WorldCombat.point(0, facts.height() * 0.45, 0));
                WorldFeedback.emit(world, dazzlinggleamScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), dazzle: leftDazzled ? 1 : 0,
                        path: [[centre.x(), centre.y(), centre.z()], [eye.x(), eye.y(), eye.z()]],
                        count: Math.round(12 + power * strength * 0.2), height: facts.height(),
                        intensity: Math.max(0.5, Math.min(2.2, power * strength / 90)) }, 24);
            });

            WorldFeedback.emit(world, dazzlinggleamScene, 1, centre,
                { moment: "flash", radius: radius, rays: rays, motes: motes, scale: scale,
                    intensity: Math.max(0.6, Math.min(2.4, power / 90)) }, 30);
            if (hits === 0) WorldFeedback.emit(world, dazzlinggleamScene, 1, centre, { moment: "miss" }, 16);
            sound(action, "minecraft:block.amethyst_block.chime");
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)),
                hits > 0 ? dazzlinggleamHitText : dazzlinggleamMissText, hits > 0 ? [hits] : [], 26);
            done(action);
        }
    });

    // 目眩存续期间，被闪花眼的人眼边留一枚短星点；效果一到头就不再续期，自然淡去。
    WorldCombat.on("world_combat:move_dazzlinggleam/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== dazzlinggleamDazzled) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "dazzlinggleam:" + String(actor.ref()), dazzlinggleamScene, 1,
            body.position().plus(WorldCombat.point(0, body.height() * 0.45, 0)),
            { moment: "dazzle", target: String(actor.ref()), height: body.height() }, 20);
    });
    // 效果被提前驱散/自然结束时，收掉那枚星点（keep 停止续期也会淡，这里给一个确定的收束）。
    WorldCombat.on("world_combat:move_dazzlinggleam/sober", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== dazzlinggleamDazzled) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, dazzlinggleamScene, 1, body.position().plus(WorldCombat.point(0, body.height() * 0.45, 0)),
            { moment: "sober", target: String(actor.ref()) }, 16);
    });
}
