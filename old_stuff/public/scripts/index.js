var Row = React.createClass({
  render: function () {
    if (this.props.index == 0)
      return (
        <tr>
          <th>
            {this.props.registro}
          </th>
          <th>
            {this.props.lote}
          </th>
          <th>
            {this.props.nome}
          </th>
          <th>
            {this.props.qtd}
          </th>
          <th>
            {"ENTRADA"}
          </th>
          <th>
            {"SAÍDA"}
          </th>
        </tr>
      );
    else {
      var classes = [];
      var balanco = parseInt(this.props.qtd) + parseInt(this.props.in) - parseInt(this.props.out);
      var sem_movimento = this.props.in == 0 && this.props.out == 0;

      if (balanco < 0)
        classes.push("error");

      if (balanco >= 0 && this.props.show_only_errors)
        return null;

      if (sem_movimento && !this.props.show_no_mov)
        return null;

      return (
        <tr className={classes.join(" ")}>
          <td id="registro">
            {this.props.registro}
          </td>
          <td id="lote">
            {this.props.lote}
          </td>
          <td id="name">
            {this.props.nome}
          </td>
          <td id="qtd">
            {this.props.qtd}
          </td>
          <td id="in">
            {this.props.in}
          </td>
          <td id="out">
            {this.props.out}
          </td>
        </tr>
      );
    }
  }
});

var Table = React.createClass({
  getInitialState: function () {
    return {shelf: [], transactions: [], show_only_errors: false, show_no_mov: true};
  },
  loadShelfFromServer: function () {
    $.ajax({
      url: this.props.shelfUrl,
      dataType: 'json',
      cache: false,
      success: function (shelf) {
        this.setState({shelf: shelf});
      }.bind(this),
      error: function (xhr, status, err) {
        console.error(this.props.shelfUrl, status, err.toString());
      }.bind(this)
    });
  },
  loadTransactionsFromServer: function () {
    $.ajax({
      url: this.props.transationsUrl,
      dataType: 'json',
      cache: false,
      success: function (transactions) {
        this.setState({transactions: transactions});
      }.bind(this),
      error: function (xhr, status, err) {
        console.error(this.props.transationsUrl, status, err.toString());
      }.bind(this)
    });
  },
  componentDidMount: function () {
    this.loadShelfFromServer();
    this.loadTransactionsFromServer();
    // setInterval(this.loadShelfFromServer, 200000);
  },
  handleClickShowOnlyErrors: function (e) {
    this.setState({show_only_errors: !this.state.show_only_errors});
  },
  handleClickHideEmptyMov: function (e) {
    this.setState({show_no_mov: !this.state.show_no_mov});
  },
  render: function () {
    return (
      <div id="shelf">
        <h1>Tabela de Fluxo</h1>
        <input type="checkbox" onClick={this.handleClickShowOnlyErrors}/> {"Mostrar apenas erros"}
        <br/>
        <input type="checkbox" onClick={this.handleClickHideEmptyMov}/> {"Não mostrar movimentos sem entrada e saída"}
        <br/>
        <br/>
        <Rows show_no_mov={this.state.show_no_mov}
              show_only_errors={this.state.show_only_errors}
              shelf={this.state.shelf} transactions={this.state.transactions}/>
      </div>
    );
  }
});

var Rows = React.createClass({
  render: function () {
    var show_no_mov = this.props.show_no_mov;
    var show_only_errors = this.props.show_only_errors;
    var transactions = this.props.transactions;
    var rows = this.props.shelf.map(function (medicamento, index) {

      var tin = 0;
      if (transactions.sumIn)
        if (transactions.sumIn[medicamento.lote])
          if (transactions.sumIn[medicamento.lote][medicamento.registro]) {
            // console.log(transactions.sumIn[medicamento.lote][medicamento.registro]);
            tin = transactions.sumIn[medicamento.lote][medicamento.registro].qtd;
          }

      var tout = 0;
      if (transactions.sumOut)
        if (transactions.sumOut[medicamento.lote])
          if (transactions.sumOut[medicamento.lote][medicamento.registro]) {
            // console.log(transactions.sumOut[medicamento.lote][medicamento.registro]);
            tout = transactions.sumOut[medicamento.lote][medicamento.registro].qtd;
          }

      return (
        <Row index={index}
             registro={medicamento.registro}
             nome={medicamento.nome}
             lote={medicamento.lote}
             qtd={medicamento.qtd}
             in={tin}
             out={tout}
             show_no_mov={show_no_mov}
             show_only_errors={show_only_errors}>
        </Row>
      );
    });
    return (
      <table>
        {rows}
      </table>
    );
  }
});

ReactDOM.render(
  <Table shelfUrl="/api/shelf" transationsUrl="/api/transactions"/>,
  document.getElementById('content')
);
