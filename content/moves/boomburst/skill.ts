/**
 * 爆音波 / boomburst 的出手方式。
 *
 * 核心念头：这是全场最响的一声——施法者先憋住一口气把空气压在身上，再猛地放开，一圈肉眼可见的声压球
 * 整圈炸开：身周所有活体（空中地上一起）被轰中并被吹开，越靠近中心声压越密、挨得越重、吹得越远；
 * 爆响留在每个人（包括施法者自己）耳里一阵耳鸣。它不看属性、不看地面，也没有飞行物——声压就是它的形状。
 *
 * 三幕：
 *   蓄（windup，提交前）：空气被压向身体、身周尘点被吸拢的预告；起手可被打断。
 *   爆（burst → hit）：提交后声压球整圈炸开；圈内每个敌人按到中心的距离衰减后各挨一次 `blast`，
 *       被沿离中心方向击飞 `shock`（中心的人吹得更远）并被抬起一点；击飞走原生受击位移入口，
 *       抗性、权限、骑乘与事件取消由它处理，被拒绝时画面也不画目标飞出。命中者与自己都挂上耳鸣。
 *   鸣（ringing）：余响在身周荡几圈，只作画面，不再造成伤害。
 *
 * 配置 `concussive`（爆压式）由 resolve 改时序、由公式改半径与威力：开启＝窄而重、吹得更远。
 */
namespace PokemonSkills {
    const boomburstScene = "world_combat:move_boomburst";
    const boomburstDeafened = "world_combat:deafened";
    const boomburstHitText = "world_combat.move.boomburst.text.hit";
    const boomburstMissText = "world_combat.move.boomburst.text.miss";

    define({
        id: "boomburst",
        name: "Boomburst",
        description: "憋住一口气再把声压整圈炸出去：身周的敌人（空中地上一起）被轰中并被击飞，越靠近中心挨得越重、吹得越远；爆响在被轰到的人（包括施法者自己）耳中留下耳鸣。爆压式更窄更重、吹得更远。",
        uses: ["被围住时一次把一圈人轰开", "把贴身的追击者吹离原位", "对空中与地面一视同仁的整圈扫场", "用一次高威力换取一段长起手"],
        kind: "self",
        range: 4.8,
        maxRange: 7.6,
        prepare: 18,
        active: 0,
        recover: 12,
        cooldown: 44,
        style: "shockwave",
        defaults: { concussive: false, ai: { maxChase: 9, minFoes: 2 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("boomburst", "blastRadius", pokemon), geometry: "area", style: "shockwave",
                color: 0xD8D8E8, label: config && config.concussive === true ? "爆压式" : "扩散式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["boomburst"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const concussive = !!(config && config.concussive);
            return {
                prepare: Math.round(p("boomburst", "prepare", context) + (concussive ? 3 : 0)),
                recover: Math.round(p("boomburst", "recover", context)),
                cooldown: Math.round(p("boomburst", "cooldown", context) + (concussive ? 8 : -2)),
                active: skills["boomburst"].active,
                range: p("boomburst", "blastRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("boomburst:charge", boomburstScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", area: p("boomburst", "blastRadius", action),
                    concussive: config && config.concussive === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(3.0, p("boomburst", "blastRadius", action));
            const power = p("boomburst", "blast", action);
            const falloff = Math.max(0.4, Math.min(0.8, p("boomburst", "falloff", action)));
            const shock = p("boomburst", "shock", action);
            const deafenTicks = Math.max(100, Math.round(p("boomburst", "deafenTicks", action)));
            const rings = Math.max(6, Math.round(p("boomburst", "rings", action)));
            const cap = Math.max(1, Math.round(p("boomburst", "maxTargets", action)));
            const scale = radius / 4.8;
            let dealt = 0;

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: 3.5, above: 4 }), function (enemy, facts) {
                const ref = String(enemy.ref());
                if (ref === String(actor.ref()) || dealt >= cap) return;
                const distance = facts.position().minus(centre).length();
                const reach = radius <= 0 ? 0 : Math.min(1, distance / radius);
                const strength = 1 - (1 - falloff) * reach;
                if (!hurt(action, enemy, "boomburst", power * strength, { damage: damageSpec("boomburst", "blast"), sound: true })) return;
                dealt++;
                const away = facts.position().minus(centre);
                let flung = false;
                if (world.valid(enemy) && away.length() > 0.2) {
                    const direction = WorldCombat.point(away.x(), 0, away.z()).unit();
                    const pushed = world.hitDisplace(enemy, direction.scale(shock * strength));
                    const lifted = world.hitImpulse(enemy, WorldCombat.point(0, shock * 0.35 * strength, 0));
                    flung = pushed > 0 || lifted;
                }
                if (world.valid(enemy)) MobEffects.apply(world, enemy, boomburstDeafened, deafenTicks, 0);
                WorldFeedback.emit(world, boomburstScene, 1, facts.position(),
                    { moment: "hit", target: ref, scale: scale, strength: strength, count: Math.round(12 + power * strength * 0.22),
                        flung: flung ? 1 : 0, fling: flung ? Math.round(10 + power * strength * 0.1) : 0,
                        intensity: Math.max(0.5, Math.min(2.2, power * strength / 110)) }, 26);
            });

            MobEffects.apply(world, actor, boomburstDeafened, deafenTicks, 0);
            WorldFeedback.emit(world, boomburstScene, 1, centre,
                { moment: "burst", radius: radius, scale: scale, rings: rings, flow: Math.round(70 + radius * 28),
                    cells: Math.round(20 + radius * 6), marks: Math.round(16 + power * 0.24),
                    intensity: Math.max(0.7, Math.min(2.4, power / 110)) }, 30);
            sound(action, "minecraft:entity.warden.sonic_boom");
            WorldFeedback.keep(world, "boomburst:ringing:" + String(actor.ref()), boomburstScene, 1, centre,
                { moment: "ringing", radius: radius, flow: Math.round(30 + radius * 16), rings: rings }, 40);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)),
                dealt > 0 ? boomburstHitText : boomburstMissText, dealt > 0 ? [dealt] : [], 26);
            done(action);
        }
    });
}
