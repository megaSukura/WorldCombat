/**
 * 辅助力量 / storedpower 的出手方式。
 *
 * 核心念头：身上攒着的每一点提升都是一层力量；把它从身体里放出去——灵光环向内收拢，然后以自己为圆心
 *   向外炸成一次灵能新星。离得近的人先被卷进去，蓄得越深范围越大、每一下越重。想放得最大就得先贴上去。
 *
 * 三幕：
 *   蓄（windup，提交前）：自身每项有正面等级的能力亮起一道灵光环，一圈圈向身体收拢（只播预告）。
 *   放（nova → hit）：提交后以身体为圆心炸开半径 `radius` 的灵能新星；圈里每个非友方吃一记 `reservoir`，
 *       并被 `surge` 向外推开。蓄积等级越多，环越多、新星越大。命中若开启倾囊，把全部正面等级一并打出去。
 *   散（spent / fade）：倾囊后等级清零并放一圈更亮的外扩光；一个人都没卷到则放 `miss`。
 *
 * 与同族分开：嚣张和辅助力量吃同一份蓄积，但嚣张是追着一个目标的物理扑击、等级留着；
 *   辅助力量以自己为圆心、逼对手先贴近，倾囊时把等级一次花光。它是这一族里唯一的**范围释放**。
 */
namespace PokemonSkills {
    define({
        id: storedpowerId,
        cooldownParameter: "recharge",
        name: "Stored Power",
        description: "把攒在身上的能力等级以自己为圆心一次放出去：圈里每个敌人各吃一记灵能新星，蓄积越多范围越大、威力越高；开启倾囊时把全部正面等级一并打出去，换来最大的一爆。",
        uses: ["先叠高能力等级再贴身放一次", "一次卷到围在身边的整圈对手", "倾囊把攒下的等级换成最大的一爆"],
        kind: "self",
        range: 3.2,
        maxRange: 7.6,
        prepare: 8,
        active: 0,
        recover: 9,
        cooldown: 30,
        style: "psychic",
        defaults: { spend: false, ai: { maxChase: 6, boostFirst: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(storedpowerId, "radius", pokemon) : 3.2, geometry: "area", style: "psychic",
                color: 0xB87CE8, label: config && config.spend === true ? "辅助力量·倾囊" : "辅助力量" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[storedpowerId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(storedpowerId, "charge", context)),
                recover: Math.round(p(storedpowerId, "settle", context)),
                cooldown: Math.round(p(storedpowerId, "recharge", context)),
                active: 0,
                range: p(storedpowerId, "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const boost = world.valid(actor) ? storedpowerBoosts(world, actor) : 0;
            const raised = world.valid(actor) ? storedpowerRaised(world, actor) : 0;
            action.present("storedpower:charge", storedpowerScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", boost: boost, raised: raised,
                    motes: Math.max(6, 10 + raised * 6 + boost * 2), spend: config && config.spend === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            if (body === null) { done(action); return; }
            const centre = body.position();
            const boosts = storedpowerBoosts(world, self);
            const raised = storedpowerRaised(world, self);
            const radius = Math.max(2.6, p(storedpowerId, "radius", action));
            const power = p(storedpowerId, "reservoir", action);
            const surge = p(storedpowerId, "surge", action);
            const motes = Math.max(8, Math.round(p(storedpowerId, "motes", action)));
            const spend = !!(config && config.spend === true);
            const scale = Math.max(0.7, Math.min(2.2, radius / 3.2));
            const intensity = Math.max(0.6, Math.min(2.6, power / 60));
            let hits = 0;

            sound(action, "cobblemon:move.psychic.actor");
            WorldFeedback.emit(world, storedpowerScene, 1, centre,
                { moment: "nova", radius: radius, boost: boosts, raised: raised, motes: motes, scale: scale, intensity: intensity }, 30);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(centre, 0, radius, { below: radius * 0.75, above: radius * 0.9 }),
                function (enemy, facts) {
                    if (!hurt(action, enemy, storedpowerId, power, { damage: damageSpec(storedpowerId, "reservoir") })) return;
                    hits++;
                    if (world.valid(enemy)) {
                        const away = facts.position().minus(centre);
                        if (away.length() > 0.2)
                            world.displace(enemy, WorldCombat.point(away.x(), 0, away.z()).unit().scale(surge));
                    }
                    WorldFeedback.emit(world, storedpowerScene, 1, facts.position(),
                        { moment: "hit", target: String(enemy.ref()), boost: boosts, raised: raised, scale: scale, intensity: intensity }, 22);
                });

            let spent = 0;
            if (hits > 0 && spend) spent = storedpowerSpend(world, self);
            if (spent > 0) {
                WorldFeedback.emit(world, storedpowerScene, 1, centre,
                    { moment: "spent", spent: spent, scale: scale, intensity: intensity }, 26);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.45, 0)), storedpowerSpendText, [spent], 28);
                world.sound("minecraft:entity.warden.sonic_boom", centre, 16, "{}");
            }
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.3, 0)),
                hits > 0 ? storedpowerHitText : storedpowerMissText, hits > 0 ? [hits] : [], 24);
            if (hits === 0) WorldFeedback.emit(world, storedpowerScene, 1, centre, { moment: "fade", scale: scale }, 20);
            done(action);
        }
    });
}
