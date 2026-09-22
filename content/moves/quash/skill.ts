/**
 * 延后 / quash 的出手方式。
 *
 * 念头的形状：目标头顶先聚起一圈暗影（windup），随后一道压制之力从身下砸下去（strike）——
 * 命中的一刻，目标正在准备的动作被打断（interrupt），身上留下 `world_combat:quash` 压制（pin）：
 * 接下来它第一次想出手会被压回去一次（deny，在提交前拦下，不花它的资源，只是晚一拍），
 * 压制期间它的移动也被拖慢；压制自然走完或被清掉就是 release。
 * 三幕：windup → strike → pin/deny → release。
 *
 * 压制是真实的 MobEffect，任何战斗者共用；宝可梦那一层与原生生物一样，不额外镜像原生异常
 * （原作的“行动顺序”在即时战斗里没有对应的原生状态）。
 */
namespace PokemonSkills {
    const quashScene = "world_combat:move_quash";
    const Quash = "world_combat:quash";
    const quashPinText = "world_combat.move.quash.text.pin";
    const quashFizzleText = "world_combat.move.quash.text.fizzle";
    // 提交前拦截发生在只读作用域，不能写世界；剩余压下次数放在本单元的瞬时脚本状态里，效果消失时清掉。
    const quashDenials: { [ref: string]: number } = {};

    WorldCombat.on("world_combat:quash/deny", "world_combat:before_commit", "", function (event) {
        var world = event.world(), actor = event.actor();
        var effect = MobEffects.read(world, actor, Quash);
        if (effect === null) return;
        var ref = String(actor.ref()), left = quashDenials[ref] === undefined ? effect.amplifier() : quashDenials[ref];
        if (left <= 0) return;
        quashDenials[ref] = left - 1;
        event.reject("quashed");
    });
    WorldCombat.on("world_combat:quash/release", "world_combat:mob_effect_removed", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== Quash) return;
        delete quashDenials[String(event.actor().ref())];
    });

    define({
        id: "quash",
        name: "Quash",
        description: "The user suppresses the target and makes its move go last.",
        uses: ["打断对手正在蓄的大招", "抢先一拍保住自己的位置", "把冲上来的目标压慢"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 8,
        active: 30,
        recover: 8,
        cooldown: 60,
        style: "press",
        defaults: { crushing: false, ai: { maxChase: 11, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["quash"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            var crushing = !!(config && config.crushing);
            return {
                prepare: p("quash", "prepare", context),
                recover: p("quash", "recover", context),
                cooldown: p("quash", "cooldown", context) + (crushing ? 20 : -8),
                range: p("quash", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_quash:windup", quashScene, 1, action.targetPosition(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const centre = action.targetPosition();
            const radius = p("quash", "traceRadius", action);
            const lockTicks = p("quash", "lockTicks", action);
            const deny = Math.max(1, Math.round(p("quash", "deny", action)));
            const hit = action.trace(origin, centre, radius);
            const target = hit.target();
            if (!hit.hitEntity() || target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, quashScene, 1, centre, { moment: "fizzle" }, 20);
                WorldFeedback.text(world, centre, quashFizzleText, [], 24);
                sound(action, "minecraft:entity.evoker.cast_spell");
                done(action);
                return;
            }
            const point = hit.position(), ref = String(target.ref());
            world.interrupt(target, "world_combat:quash");
            if (MobEffects.apply(world, target, Quash, lockTicks, deny) !== null) {
                quashDenials[ref] = deny;
                const count = Math.round(16 + lockTicks / 6);
                WorldFeedback.emit(world, quashScene, 1, point, { moment: "strike", target: ref,
                    count: count, size: 0.08 + count * 0.006, speed: 0.16 + count * 0.008 }, 30);
                WorldFeedback.emit(world, quashScene, 1, point, { moment: "pin", target: ref }, lockTicks);
                WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.3, 0)), quashPinText, [], 30);
            }
            sound(action, "minecraft:entity.warden.sonic_boom");
            done(action);
        }
    });
}
