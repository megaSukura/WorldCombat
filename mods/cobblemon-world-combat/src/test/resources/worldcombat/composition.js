// Neutral engineering contracts; loaded only by the composition server check.
var CompositionFixture = Java.loadClass('dev.worldcombat.cobblemon.checks.CompositionServerChecks');
var CompositionCatalogue = NativeRepertoire.create({ namespace: 'checks' });
CompositionCatalogue.define({ id: String(CompositionFixture.nativeId(1)), name: 'B', description: '', uses: [], kind: 'point', range: 16,
    style: '', defaults: { value: 7 }, fields: [], maximumTicks: 80, composition: { mode: 'parallel', claims: [] }, ppCost: function () { return 2; },
    run: function (action, move, settings) {
        CompositionFixture.childStarted(action, JSON.stringify(NativeLoadout.invocation(action)), settings.value);
        action.after(1, function (current) { current.commit(6); CompositionFixture.childCommitted(current); current.finish(); });
    }
});
CompositionCatalogue.define({ id: String(CompositionFixture.nativeId(0)), name: 'A', description: '', uses: [], kind: 'self', range: 0,
    style: '', defaults: {}, fields: [], maximumTicks: 80, composition: { mode: 'parallel', claims: ['movement'] },
    run: function (action) {
        action.commit(40); CompositionFixture.parentStarted(action);
        action.after(4, function (current) {
            var result = NativeLoadout.fork(current, 1, { lifetime: 'independent', input: {
                target: null, point: WorldCombat.point(10, 100, 2), direction: WorldCombat.point(1, 0, 0)
            } });
            CompositionFixture.forked(result);
        });
        action.after(20, function (current) { current.finish(); });
    }
});
WorldCombat.registerAction('checks:casting', '1', 10, 'self', 0, function (a) {
    a.commit(1); a.effect('checks:emitter', a.actor(), '{}', 80); a.finish();
});
WorldCombat.registerAction('checks:ongoing', '1', 100, 'self', 0, function (a) { a.commit(1); });
WorldCombat.effect('checks:emitter', 1, 200, 'actor', function (json) { return JSON.stringify(JSON.parse(json)); }, EffectProtocols.unchanged);
WorldCombat.effectHandler('checks:emitter', 'start', function (e) { CompositionFixture.effectStarted(e); e.schedule('emit', 'emit', 3, '{}'); });
WorldCombat.effectHandler('checks:emitter', 'emit', function (e) {
    var origin = e.world().observe(e.source()).position();
    for (var index = 0; index < 2; index++) WorldEffects.projectile(e, {
        origin: origin, velocity: WorldCombat.point(.8, 0, 0), radius: .2, range: 20, lifetime: 50,
        hit: 'hit', complete: 'complete', input: { index: index }, appearance: { pierce: 1 }
    });
});
WorldCombat.effectHandler('checks:emitter', 'hit', function (e) {
    var hit = e.impact(); if (hit.hitEntity()) {
        if (!e.world().projectileHit(hit, 1, '{"bypassCooldown":true,"knockback":false}')) throw new Error('Projectile settlement refused');
        CompositionFixture.effectHit(e);
    }
});
WorldCombat.effectHandler('checks:emitter', 'complete', function (e) { CompositionFixture.effectComplete(e); });
WorldCombat.effectHandler('checks:emitter', 'operation:checks:slow', function (e) {
    e.unschedule('emit');
    var id = e.world().projectile(e.world().observe(e.source()).position(), WorldCombat.point(0, .2, 0), 0, .1, 40, 100,
        'hit', 'complete', '{}', '{}'); CompositionFixture.slowFlight(id);
});
WorldBodies.define('checks:body', {
    start: function (brain) { brain.schedule('emit', 'emit', 4, '{}'); },
    handlers: {
        emit: function (brain) {
            WorldEffects.projectile(brain, { origin: brain.world().observe(brain.source()).position(), velocity: WorldCombat.point(.8, 0, 0),
                radius: .2, range: 16, lifetime: 30, hit: 'hit', complete: 'complete', input: { body: true } });
        },
        hit: function (brain) {
            if (brain.impact().hitEntity()) {
                if (!brain.world().projectileHit(brain.impact(), 1, '{"bypassCooldown":true,"knockback":false}')) throw new Error('Body settlement refused');
                CompositionFixture.bodyHit(brain);
            }
        },
        complete: function (brain) { CompositionFixture.bodyComplete(brain); }
    }
});
WorldCombat.on('checks:body_spawn', 'checks:spawn', '', function (event) {
    var body = WorldBodies.spawn(event.world(), WorldCombat.point(2, 100, 4), { size: [.5, .5], health: 10, gravity: false }, 'checks:body', {}, 150);
    CompositionFixture.bodySpawned(body);
});
WorldCombat.registerAction('checks:aiming', '1', 30, 'self', 0, function (action) {
    action.commit(1);
    function aim(current) { current.face(current.origin().plus(WorldCombat.point(0, 0, 8)), 180, 180); current.after(1, aim); }
    aim(action);
});
WorldCombat.composition('checks:aiming', '{"mode":"parallel","claims":["aim"]}');
WorldCombat.registerAction('checks:background', '1', 10, 'self', 0, function (action) {
    action.commit(1); action.after(1, function (current) { current.finish(); });
});
WorldCombat.composition('checks:background', '{"mode":"parallel","claims":[]}');
NativeLoadout.define(String(CompositionFixture.nativeId(3)), 'checks:submit_child', '1', 80, 'self', 0, function (action) {
    CompositionFixture.submissionChild(action); action.commit(1); action.after(20, function (current) { current.finish(); });
}, NativeLoadout.defaultCost, { mode: 'parallel', claims: [] });
NativeLoadout.define(String(CompositionFixture.nativeId(2)), 'checks:submit_parent', '1', 10, 'self', 0, function (action) {
    CompositionFixture.submissionParent(action); action.commit(1);
    var result = NativeLoadout.fork(action, 3, { lifetime: 'independent' });
    if (!result.accepted()) throw new Error('Independent child refused: ' + result.reason());
    action.finish();
}, NativeLoadout.defaultCost, { mode: 'parallel', claims: [] });
WorldCombat.registerAction('checks:immediate', '1', 10, 'self', 0, function (action) {
    CompositionFixture.submissionParent(action); action.commit(1);
    var result = action.child('checks:continuation', action.actor(), action.origin(), action.direction(), '{}', 'independent');
    if (!result.accepted()) throw new Error('Independent continuation refused: ' + result.reason());
    action.finish();
});
WorldCombat.composition('checks:immediate', '{"mode":"parallel","claims":[]}');
WorldCombat.registerAction('checks:continuation', '1', 80, 'self', 0, function (action) {
    CompositionFixture.submissionChild(action); action.commit(1); action.after(20, function (current) { current.finish(); });
});
WorldCombat.composition('checks:continuation', '{"mode":"parallel","claims":[]}');
(function () {
    var library = new WorldMethods.Library(), tasks = new WorldMethods.Tasks(library), progress = {};
    var nativeId = String(CompositionFixture.nativeId(2));
    function followed(context, item, target, state) {
        CompositionFixture.submissionFollowed(state.instance, context.services.world); return WorldBehavior.success();
    }
    library.register(nativeId, { protocols: ['checks:submit'], after: followed });
    library.register('checks:grant', { protocols: ['checks:submit'], after: followed });
    var adapter = new PokemonBehaviorHost.Adapter(library, {
        supports: function (id) { return id === nativeId; },
        describe: function (world, actor, id) { return id === nativeId ? { kind: 'self', range: 0, config: {} } : null; }
    });
    WorldCombat.on('checks:submit_task', 'checks:submit_task', '', function (event) {
        var request = JSON.parse(event.data()), world = event.world(), source = world.source();
        var frame = adapter.frame(world, CobblemonCombat.pokemon(source), 'follow', world.observe(source).position(), null, null, null, 16, '',
            function (slot, target, point, direction, input) {
                return request.kind === 'tactics' ? Number(CompositionFixture.submissionScope().submitInput(slot, target, point, direction, input))
                    : Number(CobblemonCombat.skill(world, slot).submit(target, point, direction));
            }, function () {});
        if (request.kind === 'ability') {
            frame.capabilities = [];
            WorldAbilities.grant(frame, { id: 'checks:grant', action: 'checks:immediate', use: 'checks:grant', protocols: ['checks:submit'], kind: 'self', range: 0 });
        }
        frame.scratch = {}; frame.senses = {}; frame.memory = {}; frame.active = null; frame.suspended = [];
        frame.choice = { key: 'checks:submission', execution: {} };
        if (request.phase === 'start') progress = {};
        var result = tasks.perform(frame, frame.capabilities[0].id, 'checks:submit', frame.facts.self, progress);
        if (request.phase === 'start') {
            if (result.state !== 'running') throw new Error('Submission did not enter its task');
            CompositionFixture.submitted(progress.instance);
        } else if (result.state !== 'succeeded') throw new Error('Task waited for a surviving child instead of its submitted parent');
    });
})();
ServerEvents.tick(function (event) { CompositionFixture.tick(event.server); });
