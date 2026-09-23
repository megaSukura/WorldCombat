/**
 * 换档 / shiftgear 的执行组织。
 *
 * 核心念头：把自己当成一台机器换挡。齿轮环在身侧加速旋转，到位后「咔」地锁定，
 * 攻击与速度一起升上去——起步要时间，换完你就是另一台机器，追得上也打得动。
 *
 * 出手：起手随速度（windup 播齿轮环加速），可被打断，打断不消耗任何东西。
 * 换挡：提交后同时 NativeEffects.boost(atk, attackGift) 与 boost(spe, speedGift)；
 *       齿轮环锁定并沿速度线冲起，`overrun` 刻内持续绕身拖尾，把「挡位在线」画出来。
 * 反制：换挡期间会停下来；起手越慢，越容易在完成前被打断，白花一次 PP。
 */
namespace PokemonSkills {
    const shiftgearScene = "world_combat:move_shiftgear";
    const shiftgearGearText = "world_combat.move.shiftgear.text.gear";

    define({
        id: "shiftgear",
        cooldownParameter: "wait",
        name: "换档",
        description: "转动齿轮提高自己的攻击与速度。扭力档偏重攻击，超速档偏重追击，两档提升总量相同。",
        uses: ["开场把自己变成另一台机器", "在追人前先提速", "被迫近身前抢先换挡"],
        kind: "self",
        range: 0,
        prepare: 12,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "gear",
        defaults: { gear: 1, ai: { maxChase: 16, minGap: 4 } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shiftgear"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("shiftgear", "telegraph", context)),
                recover: Math.round(p("shiftgear", "aftermath", context)),
                cooldown: Math.round(p("shiftgear", "wait", context)),
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shiftgear:windup", shiftgearScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", gear: config.gear === 1 ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const attack = Math.max(1, Math.min(3, Math.round(p("shiftgear", "attackGift", action))));
            const speed = Math.max(1, Math.min(3, Math.round(p("shiftgear", "speedGift", action))));
            const orbit = Math.max(0.9, p("shiftgear", "orbit", action));
            const overrun = Math.max(20, Math.round(p("shiftgear", "overrun", action)));
            NativeEffects.boost(world, self, "atk", attack);
            NativeEffects.boost(world, self, "spe", speed);
            const body = world.observe(self);
            if (body !== null) {
                const scale = orbit / 1.6;
                const power = (attack + speed) * 12;
                WorldFeedback.emit(world, shiftgearScene, 1, body.position(),
                    { moment: "engage", orbit: orbit, scale: scale, power: power, attack: attack, speed: speed }, 30);
                WorldFeedback.emit(world, shiftgearScene, 1, body.position(),
                    { moment: "run", orbit: orbit, scale: scale, power: power }, Math.max(20, overrun));
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), shiftgearGearText, [attack, speed], 34);
                world.sound("minecraft:block.piston.extend", body.position(), 18, "{}");
            }
            done(action);
        }
    });
}
