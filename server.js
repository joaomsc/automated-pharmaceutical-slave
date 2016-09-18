var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var cheerio = require('cheerio');

var COMMENTS_FILE = path.join(__dirname, 'data/comments.json');
var SHELF_HTML_FILE = path.join(__dirname, 'data/inventory.html');
var TRANSACTIONS_XML_FILE = path.join(__dirname, 'data/anvisa.xml');

app.set('port', (process.env.PORT || 3000));

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Additional middleware which will set headers that we need on each request.
app.use(function (req, res, next) {
  // Set permissive CORS header - this allows this server to be used only as
  // an API server in conjunction with something like webpack-dev-server.
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Disable caching so we'll always get the latest comments.
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

app.get('/api/shelf', function (req, res) {
  fs.readFile(SHELF_HTML_FILE, 'binary', function (err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    const $ = cheerio.load(data);
    const medicamentos_armario = $('table.formulario').find('tr[align="middle"]').map((i, element) => ({
      registro: $(element).find('td[class="semBorda"]').eq(0).text().trim().replace(/\.|-/g, ""),
      nome: $(element).find('td[class="semBorda"]').eq(1).text().trim(),
      lote: $(element).find('td[class="semBorda"]').eq(2).text().trim(),
      qtd: $(element).find('td[class="semBorda"]').eq(3).text().trim()
    })).get();
    //Header and footer removed
    _.remove(medicamentos_armario, function (value, index) {
      return index == medicamentos_armario.length - 1;
    });
    res.json(medicamentos_armario);
  });
});

app.get('/api/transactions', function (req, res) {
  fs.readFile(TRANSACTIONS_XML_FILE, 'binary', function (err, data) {

    if (err) {
      console.error(err);
      process.exit(1);
    }

    const $ = cheerio.load(data, {
      normalizeWhitespace: true,
      xmlMode: true
    });

    const movimentos = {in: {}, out: {}, sumOut: {}, sumIn: {}};
    movimentos.in = $('medicamentos').find('entradaMedicamentos').map((i, element) => ({
      registro: $(element).children('medicamentoEntrada').children('registroMSMedicamento').text().trim(),
      lote: $(element).children('medicamentoEntrada').children('numeroLoteMedicamento').text().trim(),
      qtd: $(element).children('medicamentoEntrada').children('quantidadeMedicamento').text().trim(),
      und: $(element).children('medicamentoEntrada').children('unidadeMedidaMedicamento').text().trim(),
      data: $(element).children('dataRecebimentoMedicamento').text().trim()
    })).get();

    movimentos.out = $('medicamentos').find('saidaMedicamentoVendaAoConsumidor').map((i, element) => ({
      registro: $(element).children('medicamentoVenda').children('registroMSMedicamento').text().trim(),
      lote: $(element).children('medicamentoVenda').children('numeroLoteMedicamento').text().trim(),
      qtd: $(element).children('medicamentoVenda').children('quantidadeMedicamento').text().trim(),
      und: $(element).children('medicamentoVenda').children('unidadeMedidaMedicamento').text().trim(),
      data: $(element).children('dataVendaMedicamento').text().trim(),
    })).get();

    _.forEach(movimentos.out, function (value) {
      if (_.isEmpty(movimentos.sumOut[value.lote]))
        movimentos.sumOut[value.lote] = {};
      if (!_.isEmpty(movimentos.sumOut[value.lote][value.registro]))
        movimentos.sumOut[value.lote][value.registro]['qtd'] += parseInt(value.qtd);
      else {
        movimentos.sumOut[value.lote][value.registro] = {
          data: value.data,
          und: value.und,
          qtd: parseInt(value.qtd)
        }
      }
    });

    _.forEach(movimentos.in, function (value) {
      if (_.isEmpty(movimentos.sumIn[value.lote]))
        movimentos.sumIn[value.lote] = {};
      if (!_.isEmpty(movimentos.sumIn[value.lote][value.registro]))
        movimentos.sumIn[value.lote][value.registro]['qtd'] += parseInt(value.qtd);
      else {
        movimentos.sumIn[value.lote][value.registro] = {
          data: value.data,
          und: value.und,
          qtd: parseInt(value.qtd)
        }
      }
    });

    res.json(movimentos);
  });
});


app.get('/api/comments', function (req, res) {
  fs.readFile(COMMENTS_FILE, function (err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    res.json(JSON.parse(data));
  });
});

app.post('/api/comments', function (req, res) {
  fs.readFile(COMMENTS_FILE, function (err, data) {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    var comments = JSON.parse(data);
    // NOTE: In a real implementation, we would likely rely on a database or
    // some other approach (e.g. UUIDs) to ensure a globally unique id. We'll
    // treat Date.now() as unique-enough for our purposes.
    var newComment = {
      id: Date.now(),
      author: req.body.author,
      text: req.body.text,
    };
    comments.push(newComment);
    fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 4), function (err) {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      res.json(comments);
    });
  });
});


app.listen(app.get('port'), function () {
  console.log('Server started: http://localhost:' + app.get('port') + '/');
});
