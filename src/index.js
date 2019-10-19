const { ApolloServer, gql } = require('apollo-server')
const Sequelize = require('./database')
const Writer = require('./models/writer')
const Book = require('./models/book')


const typeDefs = gql`
    type Writer {
        id: ID!
        firstname: String!
        lastname: String!
        initials: String
        birthday: String
        gender: String
        phone: String
        books: [Book]
    }

    type Book {
        id: ID!
        title: String!
        ISBN: Int!
        publicationDate: String!
        genre: String
        writer: Writer!
    }

    type Query {
        allBooks: [Book]
    }

    type Mutation {
        createBook(data: CreateBookInput): Book
    }

    input CreateBookInput {
        title: String!
        ISBN: Int!
        publicationDate: String!
        genre: String
        writer: CreateWriterInput!
    }

    input CreateWriterInput {
        firstname: String!
        lastname: String!
        initials: String
        birthday: String
        gender: String
        phone: String
    }

`

const resolver = {
    Query: {
        allBooks() {
            return Book.findAll({ include: [Writer] })
        }
    },
    Mutation: {
        async createBook(parent, body, context, info) {
            const [createdWriter, created] =
                await Writer.findOrCreate(
                    { where: body.data.writer }
                )
            body.data.writer = null
            const book = await Book.create(body.data)
            await book.setWriter(createdWriter.get('id'))

            return book.reload({ include: [Writer] })
        }
    }
}

const server = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: resolver
});


Sequelize.sync().then(() => {
    server.listen()
        .then(() => {
            console.log('Servidor rodando')
        })
})
